
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const FLIGHTLINE_DIR = path.join(process.cwd(), '.flightline');
const CTK_DIR = path.join(FLIGHTLINE_DIR, 'ctk');

function ensureDirectory() {
  if (!fs.existsSync(CTK_DIR)) {
    fs.mkdirSync(CTK_DIR, { recursive: true });
  }
}

function checksumFile(filePath: string) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return null;
  }
}

export function registerCtkRoutes(router: any, headers: Record<string, string>) {
  ensureDirectory();

  
  router.get('/api/v1/ctk/reservations', async (req: Request) => {
    try {
      const files = fs.readdirSync(CTK_DIR);
      const reservations = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = fs.readFileSync(path.join(CTK_DIR, file), 'utf-8');
          const reservation = JSON.parse(content);
          reservations.push(reservation);
        }
      }

      return new Response(JSON.stringify({ reservations }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error listing CTK reservations:', error);
      return new Response(JSON.stringify({ error: 'Failed to list reservations' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  
  router.post('/api/v1/ctk/reserve', async (req: Request) => {
    try {
      const body = await req.json();
      const { file, specialist_id, purpose = 'edit' } = body;

      if (!file || !specialist_id) {
        return new Response(JSON.stringify({ error: 'file and specialist_id are required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const reservation = {
        id: crypto.randomUUID(),
        file,
        reserved_by: specialist_id,
        reserved_at: new Date().toISOString(),
        released_at: null,
        purpose,
        checksum: checksumFile(file),
      };

      const reservationPath = path.join(CTK_DIR, `${reservation.id}.json`);
      fs.writeFileSync(reservationPath, JSON.stringify(reservation, null, 2));

      console.log(`Reserved file ${file} for specialist ${specialist_id}`);
      return new Response(JSON.stringify({ reservation }), {
        status: 201,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      return new Response(JSON.stringify({ error: 'Failed to create reservation' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });

  
  router.post('/api/v1/ctk/release', async (req: Request) => {
    try {
      const body = await req.json();
      const { reservation_id } = body;

      if (!reservation_id) {
        return new Response(JSON.stringify({ error: 'reservation_id is required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const reservationPath = path.join(CTK_DIR, `${reservation_id}.json`);
      if (!fs.existsSync(reservationPath)) {
        return new Response(JSON.stringify({ error: 'Reservation not found' }), {
          status: 404,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      const reservation = JSON.parse(fs.readFileSync(reservationPath, 'utf-8'));
      reservation.released_at = new Date().toISOString();

      fs.writeFileSync(reservationPath, JSON.stringify(reservation, null, 2));

      console.log(`Released reservation ${reservation_id}`);
      return new Response(JSON.stringify({ reservation }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error releasing reservation:', error);
      return new Response(JSON.stringify({ error: 'Failed to release reservation' }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }
  });
}
