import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { redisClient } from '../config/redis';
import { User, UserRole } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, company } = req.body;

    const redis = redisClient.getClient();
    const existingUser = await redis.hGet('users:email', email);

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user: User = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || UserRole.PROJECT_MANAGER,
      company,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await redis.hSet('users:email', email, user.id);
    await redis.hSet(`user:${user.id}`, {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    } as any);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
      user: { id: user.id, email: user.email, firstName, lastName, role },
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const redis = redisClient.getClient();
    const userId = await redis.hGet('users:email', email);

    if (!userId) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userData = await redis.hGetAll(`user:${userId}`);
    const valid = await bcrypt.compare(password, userData.password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: userId, email: userData.email, role: userData.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      user: {
        id: userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
      },
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
