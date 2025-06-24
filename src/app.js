require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const path = require('path');
const { instrument } = require('@socket.io/admin-ui');

// Inicializar o app
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true
  }
});

// Middlewares
const cors = require('./middleware/cors');
const logger = require('./src/utils/logger');
const {
  ensureAuthenticated,
  rateLimiter,
  setUserLocals,
  setCurrentPage,
  notFoundHandler,
  errorHandler
} = require('./middlewares');

// Rotas
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teachers');
const studentRoutes = require('./routes/students');
const publicRoutes = require('./routes/public');
const userRoutes = require('./routes/user');
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');
const courseRoutes = require('./routes/courses');

// Outros serviços
const { initializeFirebase } = require('./services/firebaseService');
const { setupMessageBroker } = require('./services/messageBroker');
const { checkEnvVars } = require('./utils/envChecker');

// Verifica variáveis de ambiente obrigatórias
checkEnvVars(['MONGODB_URI', 'SESSION_SECRET']);

// Conecta ao MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB conectado'))
  .catch(err => console.log('Erro MongoDB:', err));

// Inicializa Firebase, Redis e etc
initializeFirebase();
setupMessageBroker();

// Middlewares padrão
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors);
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 86400000 }
}));
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

// Segurança, limites e logging
app.use(require('./middleware/securityHeaders'));
app.use(require('./middleware/notificationMetrics'));
if (process.env.HTTP_LOGGING === 'true') {
  const morgan = require('morgan');
  app.use(morgan('combined', { stream: logger.stream }));
}
app.use(logger.inject);
app.use(rateLimiter);
app.use(setUserLocals);
app.use(setCurrentPage);

// Template Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rotas públicas
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/', publicRoutes);

// Rotas protegidas
app.use('/admin', ensureAuthenticated, adminRoutes);
app.use('/teachers', ensureAuthenticated, teacherRoutes);
app.use('/students', ensureAuthenticated, studentRoutes);
app.use('/users', ensureAuthenticated, userRoutes);
app.use('/courses', courseRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN'
  });
});

// Notificações e Socket.IO
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit('user-connected', userId);

    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId);
    });
  });
});

// Painel admin socket.io
instrument(io, { auth: false, mode: "development" });

// Adiciona io ao req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware final
app.use(notFoundHandler);
app.use(errorHandler);

// Inicia servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
