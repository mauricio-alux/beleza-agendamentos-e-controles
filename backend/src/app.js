const express = require('express');
const cors = require('cors');
const routes = require('./routes/index.routes');
const errorMiddleware = require('./middlewares/error.middleware');
const { getFriendlyErrorMessage } = require('./utils/error-messages');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);
app.use('/', routes);

app.use((req, res) => {
  const code = 'ROUTE_NOT_FOUND';
  const message = getFriendlyErrorMessage('NOT_FOUND');

  res.status(404).json({
    success: false,
    code,
    message,
    error: {
      code,
      message
    }
  });
});

app.use(errorMiddleware);

module.exports = app;
