import { Router } from 'express';
import { agentOrchestrator } from '../agents/orchestrator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AgentType } from '../models/types';

const router = Router();

router.use(authenticate);

router.post('/execute', async (req: AuthRequest, res) => {
  try {
    const { agentType, input, projectId } = req.body;
    
    if (!Object.values(AgentType).includes(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }

    const result = await agentOrchestrator.executeAgent(agentType, input, projectId);
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/orchestrate', async (req: AuthRequest, res) => {
  try {
    const { workflow, context, projectId } = req.body;
    const result = await agentOrchestrator.orchestrateWorkflow(workflow, context, projectId);
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/metrics', async (req: AuthRequest, res) => {
  try {
    const metrics = agentOrchestrator.getAgentMetrics();
    res.json({ data: metrics });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/health', async (req: AuthRequest, res) => {
  try {
    const health = await agentOrchestrator.getSystemHealth();
    res.json({ data: health });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/hitl', async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    const requests = await agentOrchestrator.getHITLRequests(status as any);
    res.json({ data: requests, count: requests.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/hitl/:id/approve', async (req: AuthRequest, res) => {
  try {
    const { notes } = req.body;
    await agentOrchestrator.approveHITLRequest(
      req.params.id,
      req.user!.id,
      notes
    );
    res.json({ message: 'HITL request approved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/hitl/:id/reject', async (req: AuthRequest, res) => {
  try {
    const { notes } = req.body;
    await agentOrchestrator.rejectHITLRequest(
      req.params.id,
      req.user!.id,
      notes
    );
    res.json({ message: 'HITL request rejected' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
