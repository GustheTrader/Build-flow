import { Router } from 'express';
import { projectService } from '../services/project.service';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, limit } = req.query;
    const projects = await projectService.listProjects({
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ data: projects, count: projects.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const project = await projectService.createProject(req.body);
    res.status(201).json({ data: project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await projectService.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ data: project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    res.json({ data: project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await projectService.deleteProject(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/metrics', async (req: AuthRequest, res) => {
  try {
    const metrics = await projectService.getProjectMetrics(req.params.id);
    res.json({ data: metrics });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/tasks', async (req: AuthRequest, res) => {
  try {
    const tasks = await projectService.getProjectTasks(req.params.id);
    res.json({ data: tasks, count: tasks.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/tasks', async (req: AuthRequest, res) => {
  try {
    const task = await projectService.addTask(req.params.id, req.body);
    res.status(201).json({ data: task });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
