using System;
using System.Collections.Generic;

namespace Server.Models
{
    public class TaskItem
    {
        public int Id { get; set; }
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public string Status { get; set; } = "todo"; // todo, inprogress, done
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DueDate { get; set; }

        public List<Message> Messages { get; set; } = new();
    }
}
