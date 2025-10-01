using System;
using System.ComponentModel.DataAnnotations;

namespace Server.Models
{
    public class Message
    {
        [Key]
        public int Id { get; set; }

        public string User { get; set; } = string.Empty;

        public string Text { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public int? TaskId { get; set; }

        public string? ChatId { get; set; }
    }
}
