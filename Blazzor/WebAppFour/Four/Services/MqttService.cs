using Four.Pages;
using Microsoft.JSInterop;

namespace Four.Services
{
    public class MqttService
    {
        // Indique si le client est connecté
        public bool IsConnected { get; private set; }

        // Le nom de l'utilisateur connecté
        public string Username { get; private set; } = string.Empty;

        // Événement déclenché à chaque changement de connexion
        public event Action? OnConnectionChanged;

        // Événement déclenché en cas d'erreur MQTT
        public event Action<string>? OnError;

        // Appelé pour mettre à jour l'état connecté/déconnecté
        public void SetConnected(bool connected)
        {
            IsConnected = connected;
            OnConnectionChanged?.Invoke();
        }

        // Appelé pour mémoriser le nom d'utilisateur
        public void SetUsername(string username)
        {
            Username = username;
            // (pas d'événement ici, puisque l'UI rafraîchit déjà à la connexion)
        }

        // Appelé depuis le composant en cas d'erreur
        public void RaiseError(string message)
        {
            OnError?.Invoke(message);
        }
    }
}