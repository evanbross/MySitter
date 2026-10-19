/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Booking, BookingCreate, PaginatedResponse } from "@mysitter/types";
import { apiClient } from "../lib/apiClient";

export function useBookings(status?: string) {
  return useQuery<PaginatedResponse<Booking>>({
    queryKey: ["bookings", status],
    queryFn: () => apiClient.bookings.list({ status }),
    staleTime: 30_000,
  });
}

export function useBooking(bookingId: string | undefined) {
  return useQuery<Booking>({
    queryKey: ["bookings", bookingId],
    queryFn: () => apiClient.bookings.get(bookingId!),
    enabled: !!bookingId,
    staleTime: 30_000,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation<Booking, Error, BookingCreate>({
    mutationFn: (data) => apiClient.bookings.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useConfirmBooking() {
  const qc = useQueryClient();
  return useMutation<Booking, Error, string>({
    mutationFn: (bookingId) => apiClient.bookings.confirm(bookingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation<Booking, Error, string>({
    mutationFn: (bookingId) => apiClient.bookings.cancel(bookingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCompleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => apiClient.bookings.complete(bookingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
