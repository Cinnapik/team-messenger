using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Server.Controllers
{
    // Контроллер для задач (CRUD)
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _db;
        public TasksController(AppDbContext db) => _db = db;

        // GET api/tasks
        // Возвращает все задачи (сортировка по статусу)
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
        // Создаёт задачу и возвращает созданный объект
        [HttpPost]
        public async Task<ActionResult<TaskItem>> Create(TaskItem model)
        {
            // Обеспечим статус по умолчанию, если не задан
            if (string.IsNullOrWhiteSpace(model.Status))
                model.Status = "todo";

            _db.Tasks.Add(model);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = model.Id }, model);
        }

        // PUT api/tasks/{id}
        // Обновление задачи (полная замена полей, простая реализация)
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
        // Удаляет задачу из БД
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var task = await _db.Tasks.FindAsync(id);
            if (task == null) return NotFound();
            _db.Tasks.Remove(task);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
