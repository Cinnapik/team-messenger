using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Server.Data;
using Server.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public MessagesController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<ActionResult<List<Message>>> GetHistory(int limit = 100)
        {
            var messages = await _db.Messages
                .AsNoTracking()
                .OrderByDescending(m => m.CreatedAt)
                .Take(limit)
                .ToListAsync();

            messages.Reverse();
            return Ok(messages);
        }
    }
}
