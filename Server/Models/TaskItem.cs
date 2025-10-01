using System;
using System.ComponentModel.DataAnnotations;

namespace Server.Models
{
    public class TaskItem
    {
        [Key]
        public int Id { get; set; }

        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public string Status { get; set; } = "todo";

        public int Progress { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
