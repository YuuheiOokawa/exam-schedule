import axios from 'axios';
import { FETCH_TIMEOUT_MS } from '../constants/index.js';

export const httpClient = axios.create({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    'User-Agent': 'ExamScheduleApp/2.0 (educational purposes; contact: admin@example.com)',
    'Accept-Language': 'ja,en;q=0.9',
  },
});
