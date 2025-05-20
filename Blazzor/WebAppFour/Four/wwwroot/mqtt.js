// wwwroot/mqtt.js
import mqtt from 'https://cdn.skypack.dev/mqtt';

window.connectMqtt = (brokerUrl, user, pass, dotNetHelper) => {
  const client = mqtt.connect(brokerUrl, {
    username: user,
    password: pass
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
