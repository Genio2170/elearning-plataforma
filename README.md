<!-- mensagem de erro de instalação das dependeências -->


C:\Users\Ponto Criativo\Desktop\e-learning-platform>npm install connect-mongo cookie crypto dotenv express-flash express-session tailwindcss stripe twilio 
npm warn deprecated crypto@1.0.1: This package is no longer supported. It's now a built-in Node module. If you've depended on crypto, you should switch to the one that's built-in.
npm warn cleanup Failed to remove some directories [   
npm warn cleanup   [
npm warn cleanup     '\\\\?\\C:\\Users\\Ponto Criativo\\Desktop\\e-learning-platform\\node_modules\\connect-mongo',
npm warn cleanup     [Error: EBUSY: resource busy or locked, rmdir 'C:\Users\Ponto Criativo\Desktop\e-learning-platform\node_modules\connect-mongo'] {
npm warn cleanup       errno: -4082,
npm warn cleanup       code: 'EBUSY',
npm warn cleanup       syscall: 'rmdir',
npm warn cleanup       path: 'C:\\Users\\Ponto Criativo\\Desktop\\e-learning-platform\\node_modules\\connect-mongo'
npm warn cleanup     }
npm warn cleanup   ]
npm warn cleanup ]
npm error code ECONNRESET
npm error syscall read
npm error errno -4077
npm error network read ECONNRESET
npm error network This is a problem related to network 
connectivity.
npm error network In most cases you are behind a proxy 
or have bad network settings.
npm error network
npm error network If you are behind a proxy, please make sure that the
npm error network 'proxy' config is set properly.  See: 'npm help config'
npm error A complete log of this run can be found in: C:\Users\Ponto Criativo\AppData\Local\npm-cache\_logs\2025-06-15T21_52_36_934Z-debug-0.log
<!-- fim erro -->


1. Instalar dependências:
   ```bash	
   npm install csv-writer pdfkit

Testar em ambiente de desenvolvimento**:
   ```bash	
   npm run dev


Instalar dependências:
```bash
npm install socket.io @socket.io/admin-ui

### Implementação Segura:
1. **Para Logs**:
   ```bash
   npm install mongoose-history
   ```
   # Instalar SDK
npm install firebase-admin


2. **Para 2FA**:
   ```bash
   npm install speakeasy qrcode
   ```

3. **Para Senhas**:
   ```bash
   npm install bcryptjs
   ```

4. **Monitoramento**:
   ```bash
   npm install express-brute

Migrations**:
   ```bash
   # Criar migration para preferências
   npm run migrate create add_notification_preferences
   ```
Monitoramento**:
   ```bash
   # Configurar alerta para fila cheia
   kubectl apply -f alerts/notification-queue-full.yaml


2 Comandos para Implantação**
```bash
# Aplicar configurações
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f hpa.yaml

# Verificar status
kubectl get pods -l app=notification
kubectl describe hpa notification-hpa


**Fluxo Completo Integrado**

1. **Fluxo de Notificação**:
   ```mermaid
   sequenceDiagram
       participant App
       participant Backend
       participant FCM
       participant Dispositivo

       App->>Backend: Registrar Token (POST /devices)
       Backend->>Backend: Armazenar no MongoDB
       Backend->>Redis: Publicar evento (course.updated)
       Redis->>Backend: Consumir evento
       Backend->>FCM: Enviar notificação push
       FCM->>Dispositivo: Entregar notificação
       Dispositivo->>Backend: Confirmar recebimento
   ```

2. **Monitoramento**:
   ```bash
   # Verificar métricas customizadas
   kubectl get --raw /apis/external.metrics.k8s.io/v1beta1
   ```

3. **Escalonamento Automático**:
   - Baseado em CPU (70% de utilização)
   - Baseado em tamanho da fila Redis (>1000 mensagens)


Testes de Carga**:
   ```bash
   # Simular 1000 conexões WebSocket
   k6 run --vus 1000 --duration 30s websocket-test.js


. Script de Deploy Automatizado**
```bash
#!/bin/bash
# deploy-notifications.sh

# 1. Build da imagem
docker build -t notification-service:$GIT_SHA .

# 2. Push para o registry
docker push notification-service:$GIT_SHA

# 3. Rolling update no Kubernetes
kubectl set image deployment/notification-service \
  notification=notification-service:$GIT_SHA \
  --record


# 4. Verificação health check
timeout 300 bash -c 'while [[ "$(curl -s -o /dev/null -w ''%{http_code}'' http://notification-service/health)" != "200" ]]; do sleep 5; done' || exit 1

# 5. Rollback automático em caso de falha
if [ $? -ne 0 ]; then
  kubectl rollout undo deployment/notification-service
  exit 1
fi


1 Script de Verificação**
```bash
#!/bin/bash
# test-integration.sh

# Testar conexão MongoDB
curl -s http://localhost:3000/health | jq '.db' | grep 'UP' || exit 1

# Testar endpoint de métricas
curl -s http://localhost:3000/metrics | grep 'nodejs_' || exit 1

# Testar WebSocket
timeout 5 nc -z localhost 3000 || exit 1

echo "Todos os sistemas operando normalmente!"
```
Migrações de Banco**:
   ```bash
   npm install mongoose-migrate


. Notas de Implementação**

1. **Ordem de Inicialização**:
   - Banco de Dados → Message Broker → Firebase → HTTP Server
   - Workers iniciam após todas as conexões estarem estabelecidas

2. **Segurança**:
   - Todos os middlewares de segurança aplicados antes das rotas
   - WebSocket com rate limiting e autenticação JWT

3. **Resiliência**:
   - Tratamento de erros global para rejeições não capturadas
   - Health checks para monitoramento de dependências

npm install winston winston-loki winston-elasticsearch morgan