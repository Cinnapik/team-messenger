using System;

namespace Server.Models
{
    public class Message
    {
        public int Id { get; set; }
        public string User { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int? TaskId { get; set; } // привязка к задаче, позже
    }
}
