window.connectMqtt = (brokerUrl, user, pass, dotNetHelper) => {
  const client = mqtt.connect(brokerUrl, {
    clientId: 'webapp_' + Math.random().toString(16).substr(2, 8),
    username: user,
    password: pass,
    clean: true,
    reconnectPeriod: 0
  });
    // expose le client et le helper dans le scope global
    window.mqttClient = client;
    window.dotNetHelper = dotNetHelper;
  client.on('connect', () => {
    console.log('✅ MQTT connecté');
    dotNetHelper.invokeMethodAsync('NotifyMqttConnected');
  });

  client.on('error', err => {
    console.error('❌ MQTT erreur', err);
    dotNetHelper.invokeMethodAsync('NotifyMqttError', err.message);
  });

};
window.disconnectMqtt = () => {
    if (window.mqttClient) {
        window.mqttClient.end(false, () => {
            // on notifie Blazor que c’est fini
            window.dotNetHelper.invokeMethodAsync('NotifyMqttDisconnected')
                .catch(console.error);

            // cleanup
            window.mqttClient = null;
            window.dotNetHelper = null;
        });
    }
};
window.publishMomentary = async function (topic) {
    if (!window.mqttClient || !window.mqttClient.connected) {
        console.error("MQTT non connecté !");
        return;
    }

    try {
        // Envoi true
        window.mqttClient.publish(topic, "true", { qos: 2, retain: true });

        // Pause 1 seconde
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Envoi false
        window.mqttClient.publish(topic, "false", { qos: 2, retain: true });
    } catch (err) {
        console.error("Erreur publication MQTT :", err);
    }
};
