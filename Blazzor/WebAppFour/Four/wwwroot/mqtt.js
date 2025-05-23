// mqtt.js

// États globaux
window.mqttClient = null;
window.dotNetHelper = null;
window.subscriptions = {};
let mqttConnected = false;
let mqttPingOk = false;
let pingIntervalId = null;

// 1) Connexion + démarrage de la boucle de ping
window.connectMqtt = (brokerUrl, user, pass, dotNetHelper) => {
    if (window.mqttClient && mqttConnected) {
        console.warn("✅ Déjà connecté à MQTT.");
        return;
    }

    window.dotNetHelper = dotNetHelper;
    window.mqttClient = mqtt.connect(brokerUrl, {
        clientId: 'webapp_' + Math.random().toString(16).substr(2, 8),
        username: user,
        password: pass,
        clean: true,
        reconnectPeriod: 0 // on gère la reconnexion nous-mêmes
    });

    // Callbacks MQTT
    window.mqttClient.on('connect', () => {
        mqttConnected = true;
        console.log('✅ MQTT connecté');
        dotNetHelper.invokeMethodAsync('NotifyMqttConnected').catch(console.error);
    });

    window.mqttClient.on('close', () => {
        mqttConnected = false;
        console.log('🔌 MQTT socket closed');
        dotNetHelper.invokeMethodAsync('NotifyMqttDisconnected').catch(console.error);
    });

    window.mqttClient.on('offline', () => {
        mqttConnected = false;
        console.log('📴 MQTT offline');
        dotNetHelper.invokeMethodAsync('NotifyMqttDisconnected').catch(console.error);
    });

    window.mqttClient.on('error', err => {
        mqttConnected = false;
        console.error('❌ Erreur MQTT :', err);
        dotNetHelper.invokeMethodAsync('NotifyMqttError', err.message).catch(console.error);
    });

    window.mqttClient.on('message', (topic, message) => {
        try {
            const sub = window.subscriptions[topic];
            if (sub && sub.ref && sub.method) {
                sub.ref.invokeMethodAsync(sub.method, message.toString(), sub.index)
                    .catch(err => console.error(`❌ Échec ${sub.method}(${sub.index})`, err));
            }
        } catch (err) {
            console.error("Erreur dans handler .NET depuis message MQTT :", err);
        }
    });

    // Démarrage du ping QoS 1
    startPingLoop();
};

// 2) Déconnexion + arrêt de la boucle de ping
window.disconnectMqtt = () => {
    if (!window.mqttClient) {
        console.warn("MQTT déjà déconnecté.");
        return;
    }

    clearInterval(pingIntervalId);
    pingIntervalId = null;
    mqttPingOk = false;

    window.mqttClient.end(false, () => {
        console.log("🔌 MQTT déconnecté");
        window.dotNetHelper?.invokeMethodAsync('NotifyMqttDisconnected').catch(console.error);

        // Reset globals
        window.mqttClient = null;
        window.dotNetHelper = null;
        window.subscriptions = {};
        mqttConnected = false;
    });
};

// 3) Publication “momentary”
window.publishMomentary = async (topic) => {
    if (!mqttConnected) {
        console.warn("⚠️ MQTT non connecté. Impossible de publier.");
        return;
    }
    try {
        window.mqttClient.publish(topic, "true", { qos: 1, retain: true });
        await new Promise(r => setTimeout(r, 500));
        window.mqttClient.publish(topic, "false", { qos: 1, retain: true });
    } catch (err) {
        console.error("Erreur publication momentary :", err);
    }
};

// 4) Publication de valeurs
window.publishMqttValue = (topic, value) => {
    if (!mqttConnected) {
        console.warn("⚠️ MQTT non connecté. Impossible de publier.");
        return;
    }
    try {
        window.mqttClient.publish(topic, String(value), { qos: 1, retain: true });
    } catch (err) {
        console.error("Erreur publication MQTT :", err);
    }
};

// 5) Abonnement
window.subscribeToMqtt = (topic, dotNetRef, methodName, index) => {
    if (!mqttConnected) {
        console.warn("⚠️ MQTT non connecté. Impossible de s'abonner à :", topic);
        return;
    }
    if (!topic || typeof methodName !== 'string') {
        console.warn("❌ Paramètres d'abonnement invalides.");
        return;
    }
    window.subscriptions[topic] = { ref: dotNetRef, method: methodName, index: index };
    window.mqttClient.subscribe(topic, { qos: 1 }, err => {
        if (err) console.error(`❌ Erreur abonnement à ${topic} :`, err);
        else console.log(`📡 Abonné à ${topic}`);
    });
};

// 6) Boucle de ping QoS 1
function startPingLoop() {
    if (pingIntervalId) clearInterval(pingIntervalId);
    pingIntervalId = setInterval(() => {
        if (!window.mqttClient || !mqttConnected) {
            mqttPingOk = false;
            return;
        }
        window.mqttClient.publish('health/ping', 'ping', { qos: 1 }, err => {
            mqttPingOk = !err;
            if (!mqttPingOk) {
                console.warn("⚠️ Ping MQTT failed");
                window.dotNetHelper?.invokeMethodAsync('NotifyMqttDisconnected').catch(console.error);
            }
        });
    }, 10000);
}

// 7) Exposition de l’état à .NET
window.isMqttConnected = () => {
    return mqttConnected === true && !!window.mqttClient && window.mqttClient.connected === true;
};

window.isMqttPingHealthy = () => {
    return mqttPingOk === true;
};
