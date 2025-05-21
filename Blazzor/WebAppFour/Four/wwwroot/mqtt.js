window.connectMqtt = (brokerUrl, user, pass, dotNetHelper) => {
    const client = mqtt.connect(brokerUrl, {
        clientId: 'webapp_' + Math.random().toString(16).substr(2, 8),
        username: user,
        password: pass,
        clean: true,
        reconnectPeriod: 0
    });

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

    client.on('message', (topic, message) => {
        console.log(`📩 Reçu sur ${topic}:`, message.toString());

        // Récupère la méthode .NET et l'index à partir du topic
        if (window.subscriptions && window.subscriptions[topic]) {
            const { ref, method, index } = window.subscriptions[topic];
            ref.invokeMethodAsync(method, message.toString(), index)
                .catch(err => console.error(`Erreur appel ${method}(${index})`, err));
        }
    });

    window.subscriptions = {};
};

// Déconnexion MQTT
window.disconnectMqtt = () => {
    if (window.mqttClient) {
        window.mqttClient.end(false, () => {
            window.dotNetHelper?.invokeMethodAsync('NotifyMqttDisconnected')
                .catch(console.error);

            window.mqttClient = null;
            window.dotNetHelper = null;
            window.subscriptions = {};
        });
    }
};

// Publication momentanée : true puis false après 1s
window.publishMomentary = async function (topic) {
    if (!window.mqttClient || !window.mqttClient.connected) {
        console.error("MQTT non connecté !");
        return;
    }

    try {
        window.mqttClient.publish(topic, "true", { qos: 2, retain: true });
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.mqttClient.publish(topic, "false", { qos: 2, retain: true });
    } catch (err) {
        console.error("Erreur publication MQTT :", err);
    }
};

// Publication simple de valeur
window.publishMqttValue = function (topic, value) {
    if (window.mqttClient && window.mqttClient.connected) {
        window.mqttClient.publish(topic, String(value), { qos: 2, retain: true });
    } else {
        console.warn("MQTT client non connecté, impossible de publier.");
    }
};

// Abonnement à un topic : dotNetRef, nom de la méthode, index
window.subscribeToMqtt = function (topic, dotNetRef, methodName, index) {
    if (!window.mqttClient || !window.mqttClient.connected) {
        console.error("MQTT non connecté !");
        return;
    }

    if (!window.subscriptions) window.subscriptions = {};

    window.subscriptions[topic] = {
        ref: dotNetRef,
        method: methodName,
        index: index
    };

    window.mqttClient.subscribe(topic, { qos: 2 }, err => {
        if (err) console.error(`Erreur d’abonnement à ${topic}`, err);
        else console.log(`📡 Abonné à ${topic}`);
    });
};
