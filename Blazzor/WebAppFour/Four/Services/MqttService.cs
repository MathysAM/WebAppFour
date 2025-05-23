using Microsoft.JSInterop;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Four.Services
{
    public class MqttService : IAsyncDisposable
    {
        private readonly IJSRuntime _js;
        private readonly DotNetObjectReference<MqttService> _dotNetRef;
        private PeriodicTimer? _monitorTimer;
        private CancellationTokenSource? _monitorCts;

        public bool IsConnected { get; private set; }
        public string Username { get; private set; } = string.Empty;

        public event Action? OnConnectionChanged;
        public event Action<string>? OnError;

        public MqttService(IJSRuntime js)
        {
            _js = js;
            _dotNetRef = DotNetObjectReference.Create(this);
        }

        public DotNetObjectReference<MqttService> DotNetRef => _dotNetRef;

        public async ValueTask ConnectAsync(string url, string user, string pass)
        {
            Username = user;
            await _js.InvokeVoidAsync("connectMqtt", url, user, pass, _dotNetRef);

            // Démarrage de la boucle de supervision
            _monitorCts = new CancellationTokenSource();
            _monitorTimer = new PeriodicTimer(TimeSpan.FromSeconds(5));
            _ = MonitorConnectionAsync(_monitorCts.Token);
        }

        public async ValueTask DisconnectAsync()
        {
            // Arrêt de la boucle de supervision
            _monitorCts?.Cancel();
            _monitorTimer?.Dispose();

            await _js.InvokeVoidAsync("disconnectMqtt");
        }

        private async Task MonitorConnectionAsync(CancellationToken token)
        {
            try
            {
                while (await _monitorTimer!.WaitForNextTickAsync(token))
                {
                    // Interroger l'état MQTT et le ping
                    bool jsConnected = await _js.InvokeAsync<bool>("isMqttConnected");
                    bool pingOk = await _js.InvokeAsync<bool>("isMqttPingHealthy");

                    if (IsConnected)
                    {
                        // Transition : connecté -> déconnecté
                        if (!jsConnected || !pingOk)
                        {
                           // await NotifyMqttDisconnected();
                        }
                    }
                    else
                    {
                        // Transition : déconnecté -> connecté
                        if (jsConnected && pingOk)
                        {
                            //await NotifyMqttConnected();
                        }
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // Boucle interrompue
            }
        }

        [JSInvokable]
        public Task NotifyMqttConnected()
        {
            if (!IsConnected)
            {
                IsConnected = true;
                OnConnectionChanged?.Invoke();
            }
            return Task.CompletedTask;
        }

        [JSInvokable]
        public Task NotifyMqttDisconnected()
        {
            if (IsConnected)
            {
                IsConnected = false;
                OnConnectionChanged?.Invoke();
            }
            return Task.CompletedTask;
        }

        [JSInvokable]
        public Task NotifyMqttError(string message)
        {
            if (IsConnected)
            {
                IsConnected = false;
                OnConnectionChanged?.Invoke();
            }
            OnError?.Invoke(message);
            return Task.CompletedTask;
        }

        public ValueTask DisposeAsync()
        {
            _monitorCts?.Cancel();
            _monitorTimer?.Dispose();
            _dotNetRef.Dispose();
            return ValueTask.CompletedTask;
        }
    }
}
