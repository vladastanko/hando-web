import { useState, useEffect, useRef, useCallback } from 'react';
import type { Profile } from '../types';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/ui/Avatar';
import { timeAgo } from '../utils/format';

// ── Types ────────────────────────────────────────────────────────────────
interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  job_id: string;
  job_title: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string | null;
  last_message?: string;
  last_message_at?: string;
  has_unread: boolean;
}

interface Props {
  currentUser: { id: string; email?: string };
  profile: Profile | null;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
}

// ── Component ────────────────────────────────────────────────────────────
export default function InboxScreen({ currentUser }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv,    setActiveConv]    = useState<Conversation | null>(null);
  const [messages,      setMessages]      = useState<DbMessage[]>([]);
  const [inputText,     setInputText]     = useState('');
  const [loading,       setLoading]       = useState(true);
  const [chatAvailable, setChatAvailable] = useState(true);
  const [sending,       setSending]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load conversations ─────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        job_id,
        participant_a,
        participant_b,
        job:jobs(title),
        prof_a:profiles!conversations_participant_a_fkey(id, full_name, avatar_url),
        prof_b:profiles!conversations_participant_b_fkey(id, full_name, avatar_url),
        messages(id, sender_id, content, created_at)
      `)
      .or(`participant_a.eq.${currentUser.id},participant_b.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      // Table may not exist yet — show empty state instead of crashing
      if (error.code === '42P01') setChatAvailable(false);
      setLoading(false);
      return;
    }

    type RawConv = {
      id: string;
      job_id: string;
      participant_a: string;
      participant_b: string;
      job: { title: string }[] | null;
      prof_a: { id: string; full_name: string; avatar_url: string | null }[] | null;
      prof_b: { id: string; full_name: string; avatar_url: string | null }[] | null;
      messages: DbMessage[];
    };

    const convs: Conversation[] = (data as unknown as RawConv[]).map(c => {
      const isA  = c.participant_a === currentUser.id;
      const other = isA ? c.prof_b?.[0] : c.prof_a?.[0];
      const msgs  = (c.messages ?? []).slice().sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const last = msgs[0];
      return {
        id:               c.id,
        job_id:           c.job_id,
        job_title:        c.job?.[0]?.title ?? 'Job',
        other_user_id:    other?.id    ?? '',
        other_user_name:  other?.full_name  ?? 'User',
        other_user_avatar: other?.avatar_url ?? null,
        last_message:     last?.content,
        last_message_at:  last?.created_at,
        has_unread:       !!last && last.sender_id !== currentUser.id,
      };
    });

    setConversations(convs);
    setLoading(false);
  }, [currentUser.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Load messages for active conversation ──────────────────────────
  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages((data as DbMessage[]) ?? []);
  }, []);

  // ── Subscribe to new messages in real time ─────────────────────────
  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv.id);

    const channel = supabase
      .channel(`msgs:${activeConv.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
        payload => setMessages(prev => [...prev, payload.new as DbMessage])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv, loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim() || !activeConv || sending) return;
    setSending(true);
    const content = inputText.trim();
    setInputText('');
    await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: currentUser.id,
      content,
    });
    setSending(false);
    loadConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) return <div className="loading"><span className="spin" />Loading inbox...</div>;

  // Chat not yet set up (003_chat.sql not run)
  if (!chatAvailable) {
    return (
      <div className="pg-n">
        <div className="empty" style={{ paddingTop: 80 }}>
          <span className="empty-ic">💬</span>
          <span className="empty-t">Chat not yet enabled</span>
          <span className="empty-s">
            To enable inbox & messaging, run <code style={{ background: 'var(--bg-ov)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>003_chat.sql</code> in your Supabase SQL editor.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-layout">

      {/* ── Conversation list ──────────────────────────────── */}
      <div className={`conv-list${activeConv ? ' conv-list-hidden-mobile' : ''}`}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '.9375rem', flexShrink: 0 }}>
          Messages
        </div>

        {conversations.length === 0 ? (
          <div className="empty">
            <span className="empty-ic">💬</span>
            <span className="empty-t">No conversations yet</span>
            <span className="empty-s">Conversations open automatically when an employer accepts your application.</span>
          </div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              className={`conv-it${activeConv?.id === conv.id ? ' on' : ''}`}
              onClick={() => setActiveConv(conv)}
            >
              <Avatar name={conv.other_user_name} url={conv.other_user_avatar} size="md" />
              <div className="conv-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
                  <span className="conv-nm">{conv.other_user_name}</span>
                  {conv.last_message_at && (
                    <span className="conv-tm">{timeAgo(conv.last_message_at)}</span>
                  )}
                </div>
                <div className="conv-jb">re: {conv.job_title}</div>
                {conv.last_message && (
                  <div className="conv-pv">{conv.last_message}</div>
                )}
              </div>
              {conv.has_unread && <div className="conv-un" />}
            </div>
          ))
        )}
      </div>

      {/* ── Chat area ─────────────────────────────────────── */}
      {activeConv ? (
        <div className="chat-area">
          {/* Header */}
          <div className="chat-hdr">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="btn btn-g btn-ic"
                onClick={() => setActiveConv(null)}
                style={{ display: 'var(--back-btn-display, none)', flexShrink: 0 }}
                title="Back"
              >←</button>
              <Avatar name={activeConv.other_user_name} url={activeConv.other_user_avatar} size="sm" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '.9375rem' }}>{activeConv.other_user_name}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--tx-2)' }}>re: {activeConv.job_title}</div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-msgs">
            <div className="chat-jctx">
              💼 This conversation is about: <strong>{activeConv.job_title}</strong>
            </div>

            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--tx-3)', fontSize: '.875rem', padding: '20px 0' }}>
                No messages yet. Say hello! 👋
              </div>
            ) : (
              messages.map(msg => {
                const isSent = msg.sender_id === currentUser.id;
                return (
                  <div key={msg.id} className={`msg${isSent ? ' sent' : ''}`}>
                    {!isSent && (
                      <Avatar name={activeConv.other_user_name} url={activeConv.other_user_avatar} size="sm" />
                    )}
                    <div>
                      <div className="msg-bub">{msg.content}</div>
                      <div className="msg-tm">{timeAgo(msg.created_at)}</div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="chat-inp-area">
            <textarea
              className="chat-inp"
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              className="btn btn-p"
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              style={{ height: 40, width: 40, padding: 0, borderRadius: 'var(--r)', flexShrink: 0 }}
            >
              ↑
            </button>
          </div>
        </div>
      ) : (
        <div className="chat-empty">
          <span style={{ fontSize: '2.5rem', opacity: .35 }}>💬</span>
          <span style={{ fontWeight: 600, color: 'var(--tx-2)', fontSize: '.9375rem' }}>Select a conversation</span>
          <span style={{ fontSize: '.8125rem', color: 'var(--tx-3)', maxWidth: 200, textAlign: 'center', lineHeight: 1.55 }}>
            Choose a conversation from the left to start messaging.
          </span>
        </div>
      )}

    </div>
  );
}
