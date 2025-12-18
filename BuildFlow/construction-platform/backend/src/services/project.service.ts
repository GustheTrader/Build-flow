import { redisClient } from '../config/redis';
import { Project, ProjectStatus, Task, TaskStatus, ProjectMetrics } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { agentOrchestrator } from '../agents/orchestrator';
import { AgentType } from '../models/types';

export class ProjectService {
  async createProject(projectData: Partial<Project>): Promise<Project> {
    const project: Project = {
      id: uuidv4(),
      name: projectData.name || '',
      description: projectData.description || '',
      status: projectData.status || ProjectStatus.PLANNING,
      type: projectData.type!,
      clientId: projectData.clientId || '',
      clientName: projectData.clientName || '',
      projectManager: projectData.projectManager || '',
      startDate: projectData.startDate || new Date(),
      endDate: projectData.endDate || new Date(),
      budget: projectData.budget || 0,
      actualCost: 0,
      location: projectData.location!,
      tags: projectData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const redis = redisClient.getClient();
    await redis.hSet(`project:${project.id}`, this.serializeProject(project));
    await redis.sAdd('projects:all', project.id);
    await redis.sAdd(`projects:status:${project.status}`, project.id);

    // Execute AI-powered project planning workflow
    await agentOrchestrator.orchestrateWorkflow('project_planning', {
      project,
      budget: project.budget,
      projectType: project.type,
    }, project.id);

    return project;
  }

  async getProject(projectId: string): Promise<Project | null> {
    const redis = redisClient.getClient();
    const data = await redis.hGetAll(`project:${projectId}`);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return this.deserializeProject(data);
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const redis = redisClient.getClient();
    const existing = await this.getProject(projectId);

    if (!existing) {
      throw new Error('Project not found');
    }

    // Check if status changed
    if (updates.status && updates.status !== existing.status) {
      await redis.sRem(`projects:status:${existing.status}`, projectId);
      await redis.sAdd(`projects:status:${updates.status}`, projectId);
    }

    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    await redis.hSet(`project:${projectId}`, this.serializeProject(updated));

    return updated;
  }

  async deleteProject(projectId: string): Promise<void> {
    const redis = redisClient.getClient();
    const project = await this.getProject(projectId);

    if (project) {
      await redis.del(`project:${projectId}`);
      await redis.sRem('projects:all', projectId);
      await redis.sRem(`projects:status:${project.status}`, projectId);
    }
  }

  async listProjects(filters?: { status?: ProjectStatus; limit?: number }): Promise<Project[]> {
    const redis = redisClient.getClient();
    let projectIds: string[];

    if (filters?.status) {
      projectIds = await redis.sMembers(`projects:status:${filters.status}`);
    } else {
      projectIds = await redis.sMembers('projects:all');
    }

    const projects: Project[] = [];
    for (const id of projectIds.slice(0, filters?.limit || 100)) {
      const project = await this.getProject(id);
      if (project) {
        projects.push(project);
      }
    }

    return projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = await this.getProjectTasks(projectId);
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    const overdueTasks = tasks.filter(t => 
      t.status !== TaskStatus.COMPLETED && t.dueDate < new Date()
    );

    const budgetVariance = ((project.actualCost - project.budget) / project.budget) * 100;
    const completion = completedTasks.length / Math.max(tasks.length, 1);

    // Use ML Pipeline agent to get predictive metrics
    const forecast = await agentOrchestrator.executeAgent(
      AgentType.ML_PIPELINE,
      {
        task: 'cost_forecast',
        data: {
          budget: project.budget,
          actualCost: project.actualCost,
          completion,
        },
      },
      projectId
    );

    return {
      projectId,
      budgetVariance,
      scheduleVariance: 0, // Calculate based on baseline schedule
      completionPercentage: completion * 100,
      activeTasksCount: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completedTasksCount: completedTasks.length,
      overdueTasksCount: overdueTasks.length,
      invoicedAmount: 0, // TODO: Calculate from invoices
      paidAmount: 0,
      outstandingAmount: 0,
      averagePaymentCycle: 0,
      updatedAt: new Date(),
    };
  }

  async getProjectTasks(projectId: string): Promise<Task[]> {
    const redis = redisClient.getClient();
    const taskIds = await redis.zRange(`project:${projectId}:tasks`, 0, -1);

    const tasks: Task[] = [];
    for (const taskId of taskIds) {
      const data = await redis.hGetAll(`task:${taskId}`);
      if (data && Object.keys(data).length > 0) {
        tasks.push(this.deserializeTask(data));
      }
    }

    return tasks;
  }

  async addTask(projectId: string, taskData: Partial<Task>): Promise<Task> {
    const task: Task = {
      id: uuidv4(),
      projectId,
      title: taskData.title || '',
      description: taskData.description || '',
      status: taskData.status || TaskStatus.TODO,
      priority: taskData.priority!,
      assigneeId: taskData.assigneeId || '',
      assigneeName: taskData.assigneeName || '',
      dueDate: taskData.dueDate || new Date(),
      startDate: taskData.startDate || new Date(),
      estimatedHours: taskData.estimatedHours || 0,
      dependencies: taskData.dependencies || [],
      tags: taskData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const redis = redisClient.getClient();
    await redis.hSet(`task:${task.id}`, this.serializeTask(task));
    await redis.zAdd(`project:${projectId}:tasks`, { 
      score: task.dueDate.getTime(), 
      value: task.id 
    });

    return task;
  }

  private serializeProject(project: Project): Record<string, string> {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      type: project.type,
      clientId: project.clientId,
      clientName: project.clientName,
      projectManager: project.projectManager,
      startDate: project.startDate.toISOString(),
      endDate: project.endDate.toISOString(),
      budget: project.budget.toString(),
      actualCost: project.actualCost.toString(),
      location: JSON.stringify(project.location),
      tags: JSON.stringify(project.tags),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  private deserializeProject(data: Record<string, string>): Project {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status as ProjectStatus,
      type: data.type as any,
      clientId: data.clientId,
      clientName: data.clientName,
      projectManager: data.projectManager,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      budget: parseFloat(data.budget),
      actualCost: parseFloat(data.actualCost),
      location: JSON.parse(data.location),
      tags: JSON.parse(data.tags),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private serializeTask(task: Task): Record<string, string> {
    return {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      dueDate: task.dueDate.toISOString(),
      startDate: task.startDate.toISOString(),
      completedDate: task.completedDate?.toISOString() || '',
      estimatedHours: task.estimatedHours.toString(),
      actualHours: task.actualHours?.toString() || '',
      dependencies: JSON.stringify(task.dependencies),
      tags: JSON.stringify(task.tags),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private deserializeTask(data: Record<string, string>): Task {
    return {
      id: data.id,
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status as TaskStatus,
      priority: data.priority as any,
      assigneeId: data.assigneeId,
      assigneeName: data.assigneeName,
      dueDate: new Date(data.dueDate),
      startDate: new Date(data.startDate),
      completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
      estimatedHours: parseFloat(data.estimatedHours),
      actualHours: data.actualHours ? parseFloat(data.actualHours) : undefined,
      dependencies: JSON.parse(data.dependencies),
      tags: JSON.parse(data.tags),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }
}

export const projectService = new ProjectService();
