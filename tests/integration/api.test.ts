/**
 * Integration Tests for API
 *
 * These tests verify the API endpoints work correctly with the database.
 * Run with: npm test or make test-integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('API Integration Tests', () => {
  describe('Health Endpoints', () => {
    it('GET /health should return healthy status', async () => {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('timestamp');
    });

    it('GET /health/ready should return ready status', async () => {
      const response = await fetch(`${API_URL}/health/ready`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ready');
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('redis');
    });

    it('GET /health/live should return alive status', async () => {
      const response = await fetch(`${API_URL}/health/live`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('alive');
    });
  });

  describe('Items API', () => {
    let createdItemId: string;

    it('POST /api/items should create a new item', async () => {
      const newItem = {
        name: 'Test Item',
        description: 'Integration test item',
      };

      const response = await fetch(`${API_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe(newItem.name);
      expect(data.description).toBe(newItem.description);

      createdItemId = data.id;
    });

    it('GET /api/items should return list of items', async () => {
      const response = await fetch(`${API_URL}/api/items`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.items)).toBe(true);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('limit');
    });

    it('GET /api/items/:id should return a specific item', async () => {
      const response = await fetch(`${API_URL}/api/items/${createdItemId}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(createdItemId);
      expect(data.name).toBe('Test Item');
    });

    it('PUT /api/items/:id should update an item', async () => {
      const updatedItem = {
        name: 'Updated Test Item',
        description: 'Updated description',
      };

      const response = await fetch(`${API_URL}/api/items/${createdItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe(updatedItem.name);
      expect(data.description).toBe(updatedItem.description);
    });

    it('DELETE /api/items/:id should delete an item', async () => {
      const response = await fetch(`${API_URL}/api/items/${createdItemId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(204);
    });

    it('GET /api/items/:id should return 404 for deleted item', async () => {
      const response = await fetch(`${API_URL}/api/items/${createdItemId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Jobs API', () => {
    let createdJobId: string;

    it('POST /api/jobs should create a new job', async () => {
      const newJob = {
        type: 'processData',
        data: { key: 'value' },
      };

      const response = await fetch(`${API_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob),
      });
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data).toHaveProperty('jobId');
      expect(data.status).toBe('queued');

      createdJobId = data.jobId;
    });

    it('GET /api/jobs/:id should return job status', async () => {
      const response = await fetch(`${API_URL}/api/jobs/${createdJobId}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('status');
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid item data', async () => {
      const invalidItem = {
        // missing required 'name' field
        description: 'No name',
      };

      const response = await fetch(`${API_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidItem),
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent endpoints', async () => {
      const response = await fetch(`${API_URL}/api/nonexistent`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent item', async () => {
      const response = await fetch(`${API_URL}/api/items/nonexistent-id`);

      expect(response.status).toBe(404);
    });
  });
});
