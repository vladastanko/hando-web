import { useState, useEffect, useRef, useCallback } from 'react';
import type { Profile } from '../types';
import { supabase } from '../lib/supabase';
import { Avatar } from '../components/ui/Avatar';
import { timeAgo } from '../utils/format';

interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean | null;
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
  unread_count: number;
}

interface Props {
  currentUser: { id: string; email?: string };
  profile: Profile | null;
  onMessage: (msg: string, type?: 'success' | 'error') => void;
  onUnreadChange?: (count: number) => void;
}

export default function InboxScreen({ currentUser, onUnreadChange }: Props) {
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [activeConv,     setActiveConv]     = useState<Conversation | null>(null);
  const [messages,       setMessages]       = useState<DbMessage[]>([]);
  const [inputText,      setInputText]      = useState('');
  const [loading,        setLoading]        = useState(true);
  const [chatAvailable,  setChatAvailable]  = useState(true);
  const [sending,        setSending]        = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const activeConvRef = useRef<Conversation | null>(null);

  // Keep ref in sync with state so realtime callbacks have current value
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

  // ── Load conversations ──────────────────────────────────────
  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id, job_id, participant_a, participant_b,
        job:jobs(title),
        prof_a:profiles!conversations_participant_a_fkey(id, full_name, avatar_url),
        prof_b:profiles!conversations_participant_b_fkey(id, full_name, avatar_url),
        messages(id, sender_id, content, is_read, created_at)
      `)
      .or(`participant_a.eq.${currentUser.id},participant_b.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') setChatAvailable(false);
      setLoading(false);
      return;
    }

    type RawConv = {
      id: string; job_id: string; participant_a: string; participant_b: string;
      job: { title: string }[] | { title: string } | null;
      prof_a: { id: string; full_name: string; avatar_url: string | null }[] | null;
      prof_b: { id: string; full_name: string; avatar_url: string | null }[] | null;
      messages: DbMessage[];
    };

    const convs: Conversation[] = (data as unknown as RawConv[]).map(c => {
      const isA   = c.participant_a === currentUser.id;
      const other = isA ? c.prof_b?.[0] : c.prof_a?.[0];
      const msgs  = (c.messages ?? []).slice().sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const last   = msgs[0];
      // Only count as unread if is_read is explicitly false (not null)
      const unread = msgs.filter(m => m.sender_id !== currentUser.id && m.is_read === false).length;

      // Handle job title whether it's array or object
      const jobTitle = Array.isArray(c.job) ? c.job[0]?.title : c.job?.title;

      return {
        id: c.id,
        job_id: c.job_id,
        job_title: jobTitle ?? 'Job',
        other_user_id:     other?.id ?? '',
        other_user_name:   other?.full_name ?? 'User',
        other_user_avatar: other?.avatar_url ?? null,
        last_message:    last?.content,
        last_message_at: last?.created_at,
        unread_count: unread,
      };
    }).sort((a, b) => {
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

    setConversations(convs);

    // Update badge — only real unread messages
    const totalUnread = convs.reduce((s, c) => s + c.unread_count, 0);
    onUnreadChange?.(totalUnread);

    setLoading(false);
  }, [currentUser.id, onUnreadChange]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Global realtime for badge — only re-load on new INSERT
  useEffect(() => {
    const channel = supabase
      .channel(`inbox_badge:${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, () => {
        loadConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id, loadConversations]);

  // ── Load messages in active conv ───────────────────────────
  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, is_read, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    setMessages((data as DbMessage[]) ?? []);

    // Mark all received messages as read, then immediately refresh badge
const { data: updatedRows } = await supabase
  .from('messages')
  .update({ is_read: true })
  .eq('conversation_id', convId)
  .neq('sender_id', currentUser.id)
  .eq('is_read', false)
  .select('id');

if (updatedRows && updatedRows.length > 0) {
    await loadConversations();
  }
}, [currentUser.id, loadConversations]);



  // Subscribe to messages in active conv
  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv.id);

    const channel = supabase
      .channel(`msgs:${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`,
      }, async payload => {
        const msg = payload.new as DbMessage;
        setMessages(prev => [...prev, msg]);

        if (msg.sender_id !== currentUser.id) {
          // Mark as read immediately — we're actively viewing this conv
          await supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
          await loadConversations();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConv = (conv: Conversation) => {
    setActiveConv(conv);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Send message ───────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim() || !activeConv || sending) return;
    setSending(true);
    const content = inputText.trim();
    setInputText('');

    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: currentUser.id,
      content,
      is_read: false,
    });

    setSending(false);
    if (error) console.error('Send error:', error);
    loadConversations();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) return (
    <div className="loading" style={{ height: '60vh' }}>
      <span className="spin" />Loading inbox...
    </div>
  );

  if (!chatAvailable) return (
    <div className="pg-n">
      <div className="empty" style={{ paddingTop: 80 }}>
        <span className="empty-ic">💬</span>
        <span className="empty-t">Chat not enabled</span>
        <span className="empty-s">
          Run <code style={{ background: 'var(--bg-ov)', padding: '2px 6px', borderRadius: 4 }}>
            007_chat_unread.sql
          </code> in Supabase SQL Editor.
        </span>
      </div>
    </div>
  );

  const totalUnread = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <div className="inbox-layout">

      {/* ── Conversation list ──────────────────────────────── */}
      <div className={`conv-list${activeConv ? ' conv-list-hidden-mobile' : ''}`}>
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-.015em' }}>Messages</span>
            {totalUnread > 0 && (
              <span style={{
                background: 'var(--brand)', color: '#fff',
                borderRadius: 99, fontSize: '.6875rem', fontWeight: 800,
                padding: '2px 7px', minWidth: 20, textAlign: 'center',
              }}>{totalUnread}</span>
            )}
          </div>
          {conversations.length > 0 && (
            <span style={{ fontSize: '.75rem', color: 'var(--tx-3)' }}>
              {conversations.length} chat{conversations.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="empty" style={{ padding: '40px 16px' }}>
            <span className="empty-ic">💬</span>
            <span className="empty-t">No messages yet</span>
            <span className="empty-s" style={{ textAlign: 'center', maxWidth: 200 }}>
              Conversations start when an employer accepts your application.
            </span>
          </div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              className={`conv-it${activeConv?.id === conv.id ? ' on' : ''}`}
              onClick={() => openConv(conv)}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar name={conv.other_user_name} url={conv.other_user_avatar} size="md" />
                {conv.unread_count > 0 && (
                  <span style={{
                    position: 'absolute', top: -3, right: -3,
                    background: 'var(--brand)', color: '#fff',
                    borderRadius: 99, fontSize: '.5625rem', fontWeight: 800,
                    padding: '1px 5px', minWidth: 16, textAlign: 'center',
                    border: '2px solid var(--bg-el)',
                  }}>{conv.unread_count}</span>
                )}
              </div>
              <div className="conv-info" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
                  <span className="conv-nm" style={{ fontWeight: conv.unread_count > 0 ? 800 : 600 }}>
                    {conv.other_user_name}
                  </span>
                  {conv.last_message_at && (
                    <span className="conv-tm">{timeAgo(conv.last_message_at)}</span>
                  )}
                </div>
                <div className="conv-jb">re: {conv.job_title}</div>
                {conv.last_message && (
                  <div className="conv-pv" style={{
                    fontWeight: conv.unread_count > 0 ? 600 : 400,
                    color: conv.unread_count > 0 ? 'var(--tx)' : undefined,
                  }}>
                    {conv.last_message.length > 48
                      ? conv.last_message.slice(0, 48) + '…'
                      : conv.last_message}
                  </div>
                )}
              </div>
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
                style={{ flexShrink: 0 }}
              >←</button>
              <Avatar name={activeConv.other_user_name} url={activeConv.other_user_avatar} size="sm" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '.9375rem', letterSpacing: '-.01em' }}>
                  {activeConv.other_user_name}
                </div>
                <div style={{ fontSize: '.75rem', color: 'var(--tx-2)' }}>
                  re: {activeConv.job_title}
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-msgs">
            <div className="chat-jctx">
              💼 <strong>{activeConv.job_title}</strong>
            </div>

            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center', color: 'var(--tx-3)', fontSize: '.875rem',
                padding: '32px 0', lineHeight: 1.6,
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 8, opacity: .4 }}>👋</div>
                Start the conversation — introduce yourself and confirm the details.
              </div>
            ) : (
              messages.map((msg, i) => {
                const isSent = msg.sender_id === currentUser.id;
                const showAvatar = !isSent && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);
                const isLastInGroup = i === messages.length - 1 || messages[i + 1].sender_id !== msg.sender_id;

                return (
                  <div
                    key={msg.id}
                    className={`msg${isSent ? ' sent' : ''}`}
                    style={{ marginBottom: isLastInGroup ? 12 : 3 }}
                  >
                    {!isSent && (
                      <div style={{ width: 28, flexShrink: 0 }}>
                        {showAvatar && (
                          <Avatar
                            name={activeConv.other_user_name}
                            url={activeConv.other_user_avatar}
                            size="sm"
                          />
                        )}
                      </div>
                    )}
                    <div>
                      <div
                        className="msg-bub"
                        style={{
                          borderRadius: isSent
                            ? (isLastInGroup ? '18px 18px 4px 18px' : '18px 4px 4px 18px')
                            : (isLastInGroup ? '18px 18px 18px 4px' : '4px 18px 18px 4px'),
                        }}
                      >
                        {msg.content}
                      </div>
                      {isLastInGroup && (
                        <div className="msg-tm" style={{ textAlign: isSent ? 'right' : 'left' }}>
                          {timeAgo(msg.created_at)}
                          {isSent && msg.is_read === true && (
                            <span style={{ marginLeft: 4, color: 'var(--brand)' }}>✓✓</span>
                          )}
                        </div>
                      )}
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
              ref={inputRef}
              className="chat-inp"
              placeholder="Type a message… (Enter to send)"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              style={{ resize: 'none' }}
            />
            <button
              className="btn btn-p"
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              style={{
                height: 40, width: 40, padding: 0,
                borderRadius: 'var(--r)', flexShrink: 0,
                opacity: !inputText.trim() ? .4 : 1,
              }}
            >
              {sending ? <span className="spin" style={{ width: 14, height: 14 }} /> : '↑'}
            </button>
          </div>
        </div>
      ) : (
        <div className="chat-empty">
          <span style={{ fontSize: '2.5rem', opacity: .25 }}>💬</span>
          <span style={{ fontWeight: 700, color: 'var(--tx-2)', fontSize: '1rem' }}>
            Select a conversation
          </span>
          <span style={{ fontSize: '.8125rem', color: 'var(--tx-3)', maxWidth: 220, textAlign: 'center', lineHeight: 1.6 }}>
            {conversations.length > 0
              ? 'Choose a conversation from the list to start messaging.'
              : 'Conversations open when an employer accepts your application.'}
          </span>
        </div>
      )}
    </div>
  );
}
