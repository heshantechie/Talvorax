import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'basic-api-test' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'basic-api-test' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Startup] Test server running on port ${PORT}`);
});
