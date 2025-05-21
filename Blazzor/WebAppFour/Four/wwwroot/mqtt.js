window.connectMqtt = (brokerUrl, user, pass, dotNetHelper) => {
    if (window.mqttClient && window.mqttClient.connected) {
        console.warn("✅ Déjà connecté à MQTT.");
        return;
    }

    const client = mqtt.connect(brokerUrl, {
        clientId: 'webapp_' + Math.random().toString(16).substr(2, 8),
        username: user,
        password: pass,
        clean: true,
        reconnectPeriod: 0 // désactive la reconnexion automatique
    });

    window.mqttClient = client;
    window.dotNetHelper = dotNetHelper;
    window.subscriptions = {};

    client.on('connect', () => {
        console.log('✅ MQTT connecté');
        try {
            dotNetHelper.invokeMethodAsync('NotifyMqttConnected');
        } catch (err) {
            console.error("Erreur appel NotifyMqttConnected :", err);
        }
    });

    client.on('error', err => {
        console.error('❌ Erreur MQTT :', err);
        try {
            dotNetHelper.invokeMethodAsync('NotifyMqttError', err.message);
        } catch (e) {
            console.error("Erreur appel NotifyMqttError :", e);
        }
    });

    client.on('message', (topic, message) => {
        try {
            if (window.subscriptions?.[topic]) {
                const { ref, method, index } = window.subscriptions[topic];
                if (ref && method) {
                    ref.invokeMethodAsync(method, message.toString(), index)
                        .catch(err => console.error(`❌ Échec appel ${method}(${index})`, err));
                } else {
                    console.warn(`⚠️ Méthode ou référence manquante pour ${topic}`);
                }
            }
        } catch (err) {
            console.error("Erreur dans handler .NET depuis message MQTT :", err);
        }
    });
};

window.disconnectMqtt = () => {
    if (window.mqttClient) {
        window.mqttClient.end(false, () => {
            console.log("🔌 MQTT déconnecté");

            try {
                window.dotNetHelper?.invokeMethodAsync('NotifyMqttDisconnected')
                    .catch(console.error);
            } catch (err) {
                console.error("Erreur lors de NotifyMqttDisconnected :", err);
            }

            window.mqttClient = null;
            window.dotNetHelper = null;
            window.subscriptions = {};
        });
    } else {
        console.warn("MQTT déjà déconnecté.");
    }
};

window.publishMomentary = async function (topic) {
    if (!window.mqttClient || !window.mqttClient.connected) {
        console.warn("⚠️ MQTT non connecté. Impossible de publier.");
        return;
    }

    try {
        window.mqttClient.publish(topic, "true", { qos: 2, retain: true });
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.mqttClient.publish(topic, "false", { qos: 2, retain: true });
    } catch (err) {
        console.error("Erreur publication momentary :", err);
    }
};

window.publishMqttValue = function (topic, value) {
    if (!window.mqttClient || !window.mqttClient.connected) {
        console.warn("⚠️ MQTT non connecté. Impossible de publier.");
        return;
    }

    try {
        window.mqttClient.publish(topic, String(value), { qos: 2, retain: true });
    } catch (err) {
        console.error("Erreur publication MQTT :", err);
    }
};

window.subscribeToMqtt = function (topic, dotNetRef, methodName, index) {
    if (!window.mqttClient || !window.mqttClient.connected) {
        console.warn("⚠️ MQTT non connecté. Impossible de s'abonner à :", topic);
        return;
    }

    if (!topic || typeof methodName !== 'string') {
        console.warn("❌ Paramètres d'abonnement invalides.");
        return;
    }

    window.subscriptions = window.subscriptions || {};
    window.subscriptions[topic] = {
        ref: dotNetRef,
        method: methodName,
        index: index
    };

    window.mqttClient.subscribe(topic, { qos: 2 }, err => {
        if (err) {
            console.error(`❌ Erreur abonnement à ${topic} :`, err);
        } else {
            console.log(`📡 Abonné à ${topic}`);
        }
    });
};
