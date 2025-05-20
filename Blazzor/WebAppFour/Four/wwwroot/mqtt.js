window.connectMqtt = (brokerUrl, user, pass, dotNetHelper) => {
  const client = mqtt.connect(brokerUrl, {
    clientId: 'webapp_' + Math.random().toString(16).substr(2, 8),
    username: user,
    password: pass,
    clean: true,
    reconnectPeriod: 0
  });

  client.on('connect', () => {
    console.log('✅ MQTT connecté');
    dotNetHelper.invokeMethodAsync('NotifyMqttConnected');
  });

  client.on('error', err => {
    console.error('❌ MQTT erreur', err);
    dotNetHelper.invokeMethodAsync('NotifyMqttError', err.message);
  });

  window.mqttClient = client;
};
