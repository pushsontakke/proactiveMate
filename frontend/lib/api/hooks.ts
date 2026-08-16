"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from ".";
import type { CreateTaskRequest, RescuePlanItem, TaskStatus } from "./types";

export const apiKeys = {
  tasks: ["tasks"] as const,
  schedule: ["schedule"] as const,
  rescue: ["rescue"] as const,
};

export function useTasks() {
  return useQuery({ queryKey: apiKeys.tasks, queryFn: () => api.getTasks() });
}

export function useSchedule() {
  return useQuery({ queryKey: apiKeys.schedule, queryFn: () => api.getSchedule() });
}

export function useRescuePlan() {
  return useQuery({ queryKey: apiKeys.rescue, queryFn: () => api.getRescuePlan() });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      api.updateTask(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeys.tasks });
      void queryClient.invalidateQueries({ queryKey: apiKeys.schedule });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, aiPlan }: { input: CreateTaskRequest; aiPlan: boolean }) =>
      api.createTask(input, { aiPlan }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: apiKeys.tasks }),
  });
}

export function useDecompositionPreview() {
  return useMutation({ mutationFn: api.previewDecomposition });
}

export function useApplyRescuePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: RescuePlanItem[]) => api.applyRescuePlan(items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeys.tasks });
      void queryClient.invalidateQueries({ queryKey: apiKeys.schedule });
      void queryClient.invalidateQueries({ queryKey: apiKeys.rescue });
    },
  });
}
