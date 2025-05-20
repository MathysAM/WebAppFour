using Four.Pages;
using Microsoft.JSInterop;

namespace Four.Services // adapte au nom réel de ton projet si différent
{
    public class MqttService
    {
        public bool IsConnected { get; private set; }
        public DotNetObjectReference<Home>? DotNetRef { get; set; }


        public void SetConnected(bool value) => IsConnected = value;

        public void Clear()
        {
            IsConnected = false;
            DotNetRef = null;
        }
    }
}
