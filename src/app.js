const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('./middleware/cors');
const path = require('path');
const teacherRoutes = require('./routes/teachers');
const io = require('socket.io')(server, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true
  }
});
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const httpServer = require('http').createServer(app);
const socketService = require('./services/socketService')(httpServer);
const http = require('http');
const { initializeFirebase } = require('./services/firebaseService');
const { setupSocketServer } = require('./services/socketService');
const { startDLQWorker } = require('./workers/dlqWorker');
const { initMonitoring } = require('./monitoring/prometheus');
const { setupMessageBroker } = require('./services/messageBroker');
const routes = require('./routes');
const { checkEnvVars } = require('./utils/envChecker');

// 1. Verificação inicial
checkEnvVars(['MONGODB_URI', 'REDIS_URL', 'FIREBASE_CREDENTIALS']);

// Configurações
require('dotenv').config();
require('./config/passport')(passport);

// Inicialização
const app = express();
const logger = require('./src/utils/logger');
// 2. Conexões de Infraestrutura
async function setupInfrastructure() {
  // Database
  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 50,
    socketTimeoutMS: 30000
  })
  // Redis (Para PubSub e Cache)
  await setupMessageBroker();

  // Firebase
  await initializeFirebase();
}

// Conexão com MongoDB
require('./config/db')();
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log('MongoDB conectado'))
.catch(err => console.log(err));
require('../config/adminSeed')();

// Configurações do app
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors);
app.use(express.static('public'));

// Configuração de sessão
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 dia
}));

// Passport (autenticação)
require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// Rotas
app.use('/admin', ensureAuthenticated, adminRoutes);
app.use('/teachers', ensureAuthenticated, ensureProfileComplete, teacherRoutes);
app.use('/students', ensureAuthenticated, ensureProfileComplete, studentRoutes);

// Middleware de erros
app.use(errorHandler);

// Middleware para logging de requests HTTP
if (process.env.HTTP_LOGGING === 'true') {
  const morgan = require('morgan');
  app.use(morgan('combined', { stream: logger.stream }));
}

// Injetar logger em todas as rotas
app.use(logger.inject);

// Middlewares
app.use(require('./middleware/securityHeaders'));
app.use(require('./middleware/rateLimiter'));
app.use(require('./middleware/notificationMetrics'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Middlewares globais
app.use(setUserLocals);
app.use(setCurrentPage);
app.use(rateLimiter);

// Importar middlewares
const ensureAuthenticated = require('./middleware/ensureAuthenticated');
const ensureProfileComplete = require('./middleware/ensureProfileComplete');
const errorHandler = require('./middleware/errorHandler');

// Importar rotas
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teachers');
const studentRoutes = require('./routes/students');

// Rotas públicas
app.use('/', publicRoutes);

// Rotas protegidas
app.use('/admin', ensureAuthenticated, ensureRole('admin'), adminRoutes);
app.use('/users', ensureAuthenticated, userRoutes);
app.use('/teachers', teacherRoutes);

// Rotas
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// Importar as novas rotas
const teacherRoutes = require('./routes/teacher');
const adminRoutes = require('./routes/admin');

// Adicionar middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Registrar rotas
app.use('/teacher', teacherRoutes);
app.use('/admin', adminRoutes);

// Middlewares de erro (devem vir depois das rotas)
app.use(notFoundHandler);
app.use(errorHandler);

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Template Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/courses', require('./routes/courses'));
app.use('/admin', require('./routes/admin'));
// ... outras rotas

const i18n = require('./config/i18n');
app.use(i18n.init);

io.on('connection', (socket) => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit('user-connected', userId);
    
    socket.on('disconnect', () => {
      socket.to(roomId).broadcast.emit('user-disconnected', userId);
    });
  });
});

// 5. Sistema de Notificações
app.set('io', io); // Disponibiliza para rotas

// 6. Rotas
app.use('/api', routes);
app.use('/metrics', require('./routes/metrics'));

// 7. Health Checks
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    db: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN',
    redis: io.redis.status === 'ready' ? 'UP' : 'DOWN'
  });
});

// No cliente
const socket = io();
const roomId = '123'; // ID da aula
const userId = 'abc'; // ID do usuário

socket.emit('join-room', roomId, userId);

// app.js (parte do servidor)
const http = require('http');
const socketio = require('socket.io');

io.on('connection', (socket) => {
  socket.on('joinStudentRoom', (userId) => {
    socket.join(`student_${userId}`);
  });

  socket.on('sendMessage', async (data) => {
    const message = new Message(data);
    await message.save();
    
    io.to(`student_${data.to}`).emit('newMessage', message);
    io.to(`teacher_${data.from}`).emit('newMessage', message);
  });
});


const server = http.createServer(app);

// Substitua app.listen por:
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// Lógica de conexão Socket.io
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);
  
  // Junta o usuário à sua sala pessoal
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`Usuário ${userId} entrou na sua sala`);
  });

  // Notificações
  socket.on('mark-as-read', (notificationId) => {
    // Lógica para marcar notificação como lida
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Adicione io ao objeto req para acessar em rotas
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/courses/:id', async (req, res, next) => {
  const course = await cacheService.getCourse(req.params.id);
  res.locals.preloadedData = {
    course,
    teacher: await cacheService.get(`user:${course.teacherId}`)
  };
  next();
});

const { 
  ensureAuthenticated,
  rateLimiter,
  csrfProtection,
  setUserLocals,
  setCurrentPage,
  notFoundHandler,
  errorHandler
} = require('./middlewares');


   if (process.env.ENABLE_BACKUPS === 'true') {
     require('./services/backupService').setupBackups();
   }


io.on('connection', (socket) => {
  socket.on('admin-dashboard', () => {
    setInterval(async () => {
      const stats = await getRealTimeStats();
      socket.emit('stats-update', stats);
    }, 5000);
  });
});

const { instrument } = require('@socket.io/admin-ui');

// Painel de administração do Socket.IO
instrument(io, {
  auth: false,
  mode: "development"
});

// Emitir stats a cada 5s
setInterval(async () => {
  const stats = await require('./services/monitoringService').getSystemStats();
  io.emit('system-stats', stats);
}, 5000);

app.use('/metrics', require('./routes/metrics'));

// Substituir app.listen por:
httpServer.listen(process.env.PORT, () => {
  console.log(`Server running with WebSockets on port ${process.env.PORT}`);
});

// 9. Tratamento de Erros Global
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

app.use(require('./middleware/errorHandler'));

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// No servidor
