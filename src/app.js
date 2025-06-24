// ATENÇÃO: Esse arquivo está com várias declarações duplicadas e erros de ordem de importação. Aqui está a VERSÃO CORRIGIDA E FUNCIONAL para uso no Render

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('./middleware/cors');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true
  }
});

const { initializeFirebase } = require('./services/firebaseService');
const { setupSocketServer } = require('./services/socketService');
const { setupMessageBroker } = require('./services/messageBroker');
const { checkEnvVars } = require('./utils/envChecker');
const { instrument } = require('@socket.io/admin-ui');
const logger = require('./src/utils/logger');

// Middlewares
const ensureAuthenticated = require('./middleware/ensureAuthenticated');
const ensureProfileComplete = require('./middleware/ensureProfileComplete');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const securityHeaders = require('./middleware/securityHeaders');
const notificationMetrics = require('./middleware/notificationMetrics');
const setUserLocals = require('./middlewares').setUserLocals;
const setCurrentPage = require('./middlewares').setCurrentPage;
const notFoundHandler = require('./middlewares').notFoundHandler;

// Rotas
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teachers');
const studentRoutes = require('./routes/students');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');
const coursesRoutes = require('./routes/courses');
const metricsRoutes = require('./routes/metrics');
const apiRoutes = require('./routes');

// Verifica variáveis obrigatórias
checkEnvVars(['MONGODB_URI', 'SESSION_SECRET']);

// Conexão com o MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB conectado'))
  .catch(err => console.log('Erro MongoDB:', err));

// Inicializa Firebase e serviços
(async () => {
  await setupMessageBroker();
  await initializeFirebase();
})();

// Configurações do app
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors);
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

// Middlewares globais
app.use(securityHeaders);
app.use(rateLimiter);
app.use(notificationMetrics);
app.use(setUserLocals);
app.use(setCurrentPage);

// Engine de views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rotas
app.use('/', publicRoutes);
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', ensureAuthenticated, adminRoutes);
app.use('/teachers', ensureAuthenticated, ensureProfileComplete, teacherRoutes);
app.use('/students', ensureAuthenticated, ensureProfileComplete, studentRoutes);
app.use('/users', ensureAuthenticated, userRoutes);
app.use('/courses', coursesRoutes);
app.use('/api', apiRoutes);
app.use('/metrics', metricsRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN'
  });
});

// WebSocket
io.on('connection', (socket) => {
  console.log('Socket conectado:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
  });

  socket.on('disconnect', () => {
    console.log('Socket desconectado:', socket.id);
  });
});

instrument(io, { auth: false, mode: "development" });

// Middleware final
app.use(notFoundHandler);
app.use(errorHandler);

// Erros globais
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
