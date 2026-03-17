import { createClient } from '@supabase/supabase-js';
import type {
  Profile,
  Job,
  Application,
  CreditTransaction,
  CreditPackage,
  Rating,
  Dispute,
  Notification,
  CreateJobForm,
  RatingForm,
  DisputeForm,
  ApiResponse,
} from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================
// AUTH
// ============================================================

export const auth = {
  signUp: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  onAuthChange: (callback: (event: string, session: import('@supabase/supabase-js').Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  sendPhoneOtp: async (phone: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({ phone });
    return { data, error };
  },

  verifyPhoneOtp: async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    return { data, error };
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  },
};

// ============================================================
// PROFILES
// ============================================================

export const profiles = {
  get: async (userId: string): Promise<ApiResponse<Profile>> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error: error?.message ?? null };
  },

  getCurrent: async (): Promise<ApiResponse<Profile>> => {
    const { user } = await auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };
    return profiles.get(user.id);
  },

  update: async (userId: string, updates: Partial<Profile>): Promise<ApiResponse<Profile>> => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    return { data, error: error?.message ?? null };
  },

  uploadAvatar: async (userId: string, file: File): Promise<ApiResponse<string>> => {
    const ext = file.name.split('.').pop();
    const path = `avatars/${userId}.${ext}`;
    const { error } = await supabase.storage.from('user-media').upload(path, file, { upsert: true });
    if (error) return { data: null, error: error.message };
    const { data } = supabase.storage.from('user-media').getPublicUrl(path);
    return { data: data.publicUrl, error: null };
  },

  submitVerification: async (
    userId: string,
    idDocumentFile: File,
    selfieFile: File
  ): Promise<ApiResponse<boolean>> => {
    const uploadFile = async (file: File, path: string) => {
      const { error } = await supabase.storage.from('user-media').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('user-media').getPublicUrl(path);
      return data.publicUrl;
    };

    try {
      const idUrl = await uploadFile(idDocumentFile, `verifications/${userId}/id.${idDocumentFile.name.split('.').pop()}`);
      const selfieUrl = await uploadFile(selfieFile, `verifications/${userId}/selfie.${selfieFile.name.split('.').pop()}`);

      const { error } = await supabase.from('verifications').insert({
        user_id: userId,
        id_document_url: idUrl,
        selfie_url: selfieUrl,
      });

      if (error) return { data: null, error: error.message };

      await supabase.from('profiles').update({ verification_status: 'pending' }).eq('id', userId);
      return { data: true, error: null };
    } catch (err: unknown) {
      return { data: null, error: (err as Error).message };
    }
  },

  updateLocation: async (userId: string, lat: number, lng: number): Promise<ApiResponse<boolean>> => {
    const { error } = await supabase.rpc('update_user_location', {
      user_id: userId,
      lat,
      lng,
    });
    return { data: !error, error: error?.message ?? null };
  },
};

// ============================================================
// JOBS
// ============================================================

export const jobs = {
  getNearby: async (lat: number, lng: number, radiusKm = 10): Promise<ApiResponse<Job[]>> => {
    const { data, error } = await supabase.rpc('get_nearby_jobs', {
      lat,
      lng,
      radius_km: radiusKm,
    });
    return { data: data ?? [], error: error?.message ?? null };
  },

  getAll: async (filters?: { status?: string; category_id?: string; city?: string }): Promise<ApiResponse<Job[]>> => {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        category:categories(*),
        poster:profiles!jobs_poster_id_fkey(id, full_name, avatar_url, rating_as_poster, verification_status)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.category_id) query = query.eq('category_id', filters.category_id);
    if (filters?.city) query = query.ilike('city', `%${filters.city}%`);

    const { data, error } = await query;
    return { data: data ?? [], error: error?.message ?? null };
  },

  getById: async (id: string): Promise<ApiResponse<Job>> => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        category:categories(*),
        poster:profiles!jobs_poster_id_fkey(*)
      `)
      .eq('id', id)
      .single();
    return { data, error: error?.message ?? null };
  },

  getByPoster: async (posterId: string): Promise<ApiResponse<Job[]>> => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`*, category:categories(*)`)
      .eq('poster_id', posterId)
      .order('created_at', { ascending: false });
    return { data: data ?? [], error: error?.message ?? null };
  },

  create: async (form: CreateJobForm): Promise<ApiResponse<Job>> => {
    const { user } = await auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    // Check credits
    const { data: profile } = await profiles.get(user.id);
    if (!profile || profile.credits < 10) {
      return { data: null, error: 'Insufficient credits. Posting a job costs 10 credits.' };
    }

    // Deduct credits and create job atomically
    const { data, error } = await supabase.rpc('post_job', {
      p_poster_id: user.id,
      p_title: form.title,
      p_description: form.description,
      p_category_id: form.category_id,
      p_address: form.address,
      p_city: form.city,
      p_lat: form.lat,
      p_lng: form.lng,
      p_scheduled_date: form.scheduled_date,
      p_duration_hours: form.duration_hours,
      p_pay_per_worker: form.pay_per_worker,
      p_crew_size: form.crew_size,
    });
    return { data, error: error?.message ?? null };
  },

  update: async (id: string, updates: Partial<Job>): Promise<ApiResponse<Job>> => {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error: error?.message ?? null };
  },

  complete: async (jobId: string): Promise<ApiResponse<boolean>> => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'completed' })
      .eq('id', jobId);
    return { data: !error, error: error?.message ?? null };
  },

  cancel: async (jobId: string): Promise<ApiResponse<boolean>> => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', jobId);
    return { data: !error, error: error?.message ?? null };
  },

  getCategories: async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    return { data: data ?? [], error: error?.message ?? null };
  },
};

// ============================================================
// APPLICATIONS
// ============================================================

export const applications = {
  apply: async (jobId: string, message?: string): Promise<ApiResponse<Application>> => {
    const { user } = await auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase.rpc('apply_to_job', {
      p_job_id: jobId,
      p_worker_id: user.id,
      p_message: message ?? '',
    });
    return { data, error: error?.message ?? null };
  },

  withdraw: async (applicationId: string): Promise<ApiResponse<boolean>> => {
    const { error } = await supabase
      .from('applications')
      .update({ status: 'withdrawn' })
      .eq('id', applicationId);
    return { data: !error, error: error?.message ?? null };
  },

  accept: async (applicationId: string, jobId: string): Promise<ApiResponse<boolean>> => {
    // Check crew size
    const { data: job } = await jobs.getById(jobId);
    if (!job) return { data: null, error: 'Job not found' };
    if (job.accepted_workers >= job.crew_size) {
      return { data: null, error: 'Crew is already full' };
    }

    const { error } = await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', applicationId);
    return { data: !error, error: error?.message ?? null };
  },

  reject: async (applicationId: string): Promise<ApiResponse<boolean>> => {
    const { error } = await supabase
      .from('applications')
      .update({ status: 'rejected' })
      .eq('id', applicationId);
    return { data: !error, error: error?.message ?? null };
  },

  getForJob: async (jobId: string): Promise<ApiResponse<Application[]>> => {
    const { data, error } = await supabase
      .from('applications')
      .select(`*, worker:profiles!applications_worker_id_fkey(*)`)
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });
    return { data: data ?? [], error: error?.message ?? null };
  },

  getForWorker: async (workerId: string): Promise<ApiResponse<Application[]>> => {
    const { data, error } = await supabase
      .from('applications')
      .select(`*, job:jobs(*, category:categories(*))`)
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false });
    return { data: data ?? [], error: error?.message ?? null };
  },

  checkApplied: async (jobId: string, workerId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('worker_id', workerId)
      .single();
    return !!data;
  },
};

// ============================================================
// CREDITS
// ============================================================

export const credits = {
  getBalance: async (userId: string): Promise<number> => {
    const { data } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    return data?.credits ?? 0;
  },

  getTransactions: async (userId: string): Promise<ApiResponse<CreditTransaction[]>> => {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data ?? [], error: error?.message ?? null };
  },

  getPackages: async (): Promise<ApiResponse<CreditPackage[]>> => {
    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('credits');
    return { data: data ?? [], error: error?.message ?? null };
  },

  purchase: async (packageId: string, userId: string): Promise<ApiResponse<boolean>> => {
    // In production: integrate with payment gateway (Stripe, etc.)
    // For MVP: simulate purchase
    const { data: pkg } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (!pkg) return { data: null, error: 'Package not found' };

    const { data: profile } = await profiles.get(userId);
    if (!profile) return { data: null, error: 'Profile not found' };

    const newBalance = profile.credits + pkg.credits;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: newBalance })
      .eq('id', userId);

    if (updateError) return { data: null, error: updateError.message };

    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: pkg.credits,
      type: 'purchase',
      description: `Purchased ${pkg.credits} credits for ${pkg.price_rsd} RSD`,
      balance_after: newBalance,
    });

    return { data: true, error: null };
  },
};

// ============================================================
// RATINGS
// ============================================================

export const ratings = {
  submit: async (form: RatingForm): Promise<ApiResponse<Rating>> => {
    const { user } = await auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('ratings')
      .insert({ ...form, rater_id: user.id })
      .select()
      .single();
    return { data, error: error?.message ?? null };
  },

  getForUser: async (userId: string, asRole?: 'worker' | 'poster'): Promise<ApiResponse<Rating[]>> => {
    let query = supabase
      .from('ratings')
      .select(`*, rater:profiles!ratings_rater_id_fkey(id, full_name, avatar_url)`)
      .eq('ratee_id', userId)
      .order('created_at', { ascending: false });
    if (asRole) query = query.eq('rater_role', asRole === 'worker' ? 'poster' : 'worker');
    const { data, error } = await query;
    return { data: data ?? [], error: error?.message ?? null };
  },

  getByRater: async (raterId: string): Promise<ApiResponse<Rating[]>> => {
    const { data, error } = await supabase
      .from('ratings')
      .select(`*, rater:profiles!ratings_rater_id_fkey(id, full_name, avatar_url)`)
      .eq('rater_id', raterId)
      .order('created_at', { ascending: false });
    return { data: data ?? [], error: error?.message ?? null };
  },

  canRate: async (jobId: string, raterId: string, rateeId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('ratings')
      .select('id')
      .eq('job_id', jobId)
      .eq('rater_id', raterId)
      .eq('ratee_id', rateeId)
      .single();
    return !data;
  },
};

// ============================================================
// DISPUTES
// ============================================================

export const disputes = {
  create: async (form: DisputeForm): Promise<ApiResponse<Dispute>> => {
    const { user } = await auth.getUser();
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('disputes')
      .insert({ ...form, reporter_id: user.id })
      .select()
      .single();

    // Mark job as disputed
    if (data) {
      await supabase.from('jobs').update({ status: 'disputed' }).eq('id', form.job_id);
    }

    return { data, error: error?.message ?? null };
  },

  getByUser: async (userId: string): Promise<ApiResponse<Dispute[]>> => {
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .or(`reporter_id.eq.${userId},reported_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    return { data: data ?? [], error: error?.message ?? null };
  },
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export const notifications = {
  getAll: async (userId: string): Promise<ApiResponse<Notification[]>> => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return { data: data ?? [], error: error?.message ?? null };
  },

  markRead: async (notificationId: string): Promise<void> => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  },

  markAllRead: async (userId: string): Promise<void> => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  subscribeToNew: (userId: string, callback: (n: Notification) => void) => {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => callback(payload.new as Notification))
      .subscribe();
  },
};
