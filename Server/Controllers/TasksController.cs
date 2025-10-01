using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Controllers
{
    // Контроллер для задач (CRUD) + получение связанных сообщений
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _db;
        public TasksController(AppDbContext db) => _db = db;

        // GET api/tasks
        [HttpGet]
        public async Task<ActionResult<List<TaskItem>>> GetAll()
        {
            var tasks = await _db.Tasks
                .AsNoTracking()
                .OrderBy(t => t.Status)
                .ToListAsync();
            return Ok(tasks);
        }

        // GET api/tasks/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskItem>> Get(int id)
        {
            var task = await _db.Tasks.FindAsync(id);
            if (task == null) return NotFound();
            return Ok(task);
        }

        // POST api/tasks
        [HttpPost]
        public async Task<ActionResult<TaskItem>> Create(TaskItem model)
        {
            if (string.IsNullOrWhiteSpace(model.Status))
                model.Status = "todo";

            _db.Tasks.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = model.Id }, model);
        }

        // PUT api/tasks/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, TaskItem model)
        {
            var task = await _db.Tasks.FindAsync(id);
            if (task == null) return NotFound();
            task.Title = model.Title;
            task.Description = model.Description;
            task.Status = model.Status;
            task.DueDate = model.DueDate;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE api/tasks/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var task = await _db.Tasks.FindAsync(id);
            if (task == null) return NotFound();
            _db.Tasks.Remove(task);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // GET api/tasks/{id}/messages
        // Возвращает сообщения, у которых TaskId == id, в хронологическом порядке
        [HttpGet("{id}/messages")]
        public async Task<ActionResult<List<Message>>> GetMessagesForTask(int id)
        {
            var msgs = await _db.Messages
                .AsNoTracking()
                .Where(m => m.TaskId == id)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();
            return Ok(msgs);
        }
    }
}
