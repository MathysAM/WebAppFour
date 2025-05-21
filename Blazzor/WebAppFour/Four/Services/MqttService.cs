using Microsoft.JSInterop;
using System;
using System.Threading.Tasks;

namespace Four.Services
{
    public class MqttService : IAsyncDisposable
    {
        private readonly IJSRuntime _js;
        private readonly DotNetObjectReference<MqttService> _dotNetRef;

        public bool IsConnected { get; private set; }
        public string Username { get; private set; } = string.Empty;

        public event Action? OnConnectionChanged;
        public event Action<string>? OnError;

        public MqttService(IJSRuntime js)
        {
            _js = js;
            _dotNetRef = DotNetObjectReference.Create(this);
        }

        /// <summary>
        /// Expose la référence .NET unique pour le JS interop.
        /// </summary>
        public DotNetObjectReference<MqttService> DotNetRef => _dotNetRef;

        /// <summary>
        /// Appelé par le composant pour démarrer la connexion.
        /// </summary>
        public ValueTask ConnectAsync(string url, string user, string pass)
        {
            Username = user;
            return _js.InvokeVoidAsync("connectMqtt", url, user, pass, _dotNetRef);
        }

        /// <summary>
        /// Appelé par le composant pour couper la connexion.
        /// </summary>
        public ValueTask DisconnectAsync()
        {
            return _js.InvokeVoidAsync("disconnectMqtt");
        }

        [JSInvokable]
        public Task NotifyMqttConnected()
        {
            IsConnected = true;
            OnConnectionChanged?.Invoke();
            return Task.CompletedTask;
        }

        [JSInvokable]
        public Task NotifyMqttDisconnected()
        {
            IsConnected = false;
            OnConnectionChanged?.Invoke();
            return Task.CompletedTask;
        }

        [JSInvokable]
        public Task NotifyMqttError(string message)
        {
            IsConnected = false;
            OnError?.Invoke(message);
            OnConnectionChanged?.Invoke();
            return Task.CompletedTask;
        }

        public ValueTask DisposeAsync()
        {
            _dotNetRef.Dispose();
            return ValueTask.CompletedTask;
        }
    }
}
