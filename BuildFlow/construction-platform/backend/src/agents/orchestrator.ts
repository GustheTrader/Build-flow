import {
  LangGraphAgent,
  LangSmithAgent,
  ValidationAgent,
  MinimaxAgent,
  MemoryAgent,
  MLPipelineAgent,
  GraphDBAgent,
  Agent,
} from './index';
import { AgentType, AgentRecommendation, HITLRequest, HITLStatus } from '../models/types';
import { redisClient } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export class AgentOrchestrator {
  private agents: Map<AgentType, Agent>;
  private metrics: Map<AgentType, { calls: number; avgLatency: number }>;

  constructor() {
    this.agents = new Map();
    this.metrics = new Map();
    this.initializeAgents();
  }

  private initializeAgents(): void {
    const agentInstances = [
      new LangGraphAgent(),
      new LangSmithAgent(),
      new ValidationAgent(),
      MinimaxAgent(),
      new MemoryAgent(),
      new MLPipelineAgent(),
      new GraphDBAgent(),
    ];

    agentInstances.forEach((agent) => {
      this.agents.set(agent.type, agent);
      this.metrics.set(agent.type, { calls: 0, avgLatency: 0 });
    });

    console.log(`Initialized ${this.agents.size} AI agents`);
  }

  async executeAgent(
    agentType: AgentType,
    input: any,
    projectId?: string
  ): Promise<AgentRecommendation> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Agent not found: ${agentType}`);
    }

    const startTime = Date.now();

    try {
      // Execute agent
      const recommendation = await agent.process(input);

      // Update metrics
      this.updateMetrics(agentType, Date.now() - startTime);

      // Log execution
      await this.logExecution(agentType, input, recommendation, projectId);

      // Handle HITL if required
      if (recommendation.hitlRequired) {
        await this.createHITLRequest(recommendation, projectId);
      }

      return recommendation;
    } catch (error) {
      console.error(`Error executing ${agentType}:`, error);
      throw error;
    }
  }

  async orchestrateWorkflow(
    workflow: string,
    context: any,
    projectId?: string
  ): Promise<any> {
    // Use LangGraph agent to orchestrate multi-agent workflow
    const orchestration = await this.executeAgent(
      AgentType.LANGGRAPH,
      { workflow, context },
      projectId
    );

    // Execute workflow steps based on orchestration
    const results: any = {
      workflow,
      orchestration,
      stepResults: [],
    };

    // Example: Multi-step project planning workflow
    if (workflow === 'project_planning') {
      // Step 1: Validate project data
      const validation = await this.executeAgent(
        AgentType.VALIDATION,
        { type: 'budget', data: context.budget },
        projectId
      );
      results.stepResults.push({ step: 'validation', result: validation });

      // Step 2: Retrieve historical context
      const memory = await this.executeAgent(
        AgentType.MEMORY,
        { operation: 'retrieve_context', query: context.projectType },
        projectId
      );
      results.stepResults.push({ step: 'memory', result: memory });

      // Step 3: Generate cost forecast
      const mlForecast = await this.executeAgent(
        AgentType.ML_PIPELINE,
        { task: 'cost_forecast', data: context },
        projectId
      );
      results.stepResults.push({ step: 'forecast', result: mlForecast });

      // Step 4: Optimize schedule
      const optimization = await this.executeAgent(
        AgentType.MINIMAX,
        { problem: 'schedule_optimization', data: context },
        projectId
      );
      results.stepResults.push({ step: 'optimization', result: optimization });

      // Step 5: Analyze dependencies
      const graphAnalysis = await this.executeAgent(
        AgentType.GRAPH_DB,
        { query: 'dependency_analysis', params: context },
        projectId
      );
      results.stepResults.push({ step: 'graph_analysis', result: graphAnalysis });
    }

    return results;
  }

  private updateMetrics(agentType: AgentType, latency: number): void {
    const current = this.metrics.get(agentType);
    if (current) {
      const newAvg = (current.avgLatency * current.calls + latency) / (current.calls + 1);
      this.metrics.set(agentType, {
        calls: current.calls + 1,
        avgLatency: newAvg,
      });
    }
  }

  private async logExecution(
    agentType: AgentType,
    input: any,
    recommendation: AgentRecommendation,
    projectId?: string
  ): Promise<void> {
    const log = {
      agentType,
      projectId,
      input,
      recommendation,
      timestamp: new Date().toISOString(),
    };

    try {
      const redis = redisClient.getClient();
      const key = `agent:log:${agentType}:${Date.now()}`;
      await redis.setEx(key, 86400, JSON.stringify(log)); // 24h TTL

      // Also add to stream for monitoring
      await redis.xAdd('agent:executions', '*', {
        agentType,
        confidence: recommendation.confidence.toString(),
        hitlRequired: recommendation.hitlRequired.toString(),
        timestamp: log.timestamp,
      });
    } catch (error) {
      console.error('Error logging agent execution:', error);
    }
  }

  private async createHITLRequest(
    recommendation: AgentRecommendation,
    projectId?: string
  ): Promise<HITLRequest> {
    const hitlRequest: HITLRequest = {
      id: uuidv4(),
      projectId: projectId || 'unknown',
      agentType: recommendation.agentType,
      recommendation,
      status: HITLStatus.PENDING,
      createdAt: new Date(),
    };

    try {
      const redis = redisClient.getClient();

      // Store HITL request
      await redis.hSet(`hitl:request:${hitlRequest.id}`, {
        data: JSON.stringify(hitlRequest),
      });

      // Add to pending queue
      await redis.lPush('hitl:pending', hitlRequest.id);

      // Set expiration (7 days)
      await redis.expire(`hitl:request:${hitlRequest.id}`, 604800);

      console.log(`Created HITL request: ${hitlRequest.id}`);

      return hitlRequest;
    } catch (error) {
      console.error('Error creating HITL request:', error);
      throw error;
    }
  }

  async getHITLRequests(status?: HITLStatus): Promise<HITLRequest[]> {
    try {
      const redis = redisClient.getClient();
      let requestIds: string[] = [];

      if (status === HITLStatus.PENDING) {
        requestIds = await redis.lRange('hitl:pending', 0, -1);
      } else {
        // Get all HITL requests
        const keys = await redis.keys('hitl:request:*');
        requestIds = keys.map((k) => k.replace('hitl:request:', ''));
      }

      const requests: HITLRequest[] = [];
      for (const id of requestIds) {
        const data = await redis.hGet(`hitl:request:${id}`, 'data');
        if (data) {
          requests.push(JSON.parse(data));
        }
      }

      return requests;
    } catch (error) {
      console.error('Error getting HITL requests:', error);
      return [];
    }
  }

  async approveHITLRequest(
    requestId: string,
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    await this.updateHITLRequest(requestId, HITLStatus.APPROVED, reviewerId, notes);
  }

  async rejectHITLRequest(
    requestId: string,
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    await this.updateHITLRequest(requestId, HITLStatus.REJECTED, reviewerId, notes);
  }

  private async updateHITLRequest(
    requestId: string,
    status: HITLStatus,
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    try {
      const redis = redisClient.getClient();
      const data = await redis.hGet(`hitl:request:${requestId}`, 'data');

      if (!data) {
        throw new Error(`HITL request not found: ${requestId}`);
      }

      const request: HITLRequest = JSON.parse(data);
      request.status = status;
      request.reviewerId = reviewerId;
      request.reviewerNotes = notes;
      request.reviewedAt = new Date();

      // Update request
      await redis.hSet(`hitl:request:${requestId}`, {
        data: JSON.stringify(request),
      });

      // Remove from pending queue
      await redis.lRem('hitl:pending', 0, requestId);

      console.log(`Updated HITL request ${requestId} to ${status}`);
    } catch (error) {
      console.error('Error updating HITL request:', error);
      throw error;
    }
  }

  getAgentMetrics(): any {
    const metricsData: any = {};
    this.metrics.forEach((metrics, agentType) => {
      metricsData[agentType] = metrics;
    });
    return metricsData;
  }

  async getSystemHealth(): Promise<any> {
    const agentMetrics = this.getAgentMetrics();
    const hitlPending = await this.getHITLRequests(HITLStatus.PENDING);

    return {
      status: 'healthy',
      agents: {
        total: this.agents.size,
        active: this.agents.size,
        metrics: agentMetrics,
      },
      hitl: {
        pendingCount: hitlPending.length,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Singleton instance
export const agentOrchestrator = new AgentOrchestrator();
