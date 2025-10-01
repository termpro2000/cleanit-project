import React, { useState, useEffect, useRef } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import app from '../firebase';
import { User, Conversation, Message, MessageType } from '../types';
import BackToDashboard from '../components/BackToDashboard';

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

const MessagingScreen: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showNewConversation, setShowNewConversation] =
    useState<boolean>(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      setError('로그인이 필요합니다.');
      return;
    }

    // Fetch all users for conversation creation
    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const fetchedUsers: User[] = [];
        snapshot.forEach((doc) => {
          const userData = { id: doc.id, ...doc.data() } as User;
          if (userData.id !== currentUser.uid) {
            // Exclude current user
            fetchedUsers.push(userData);
          }
        });
        setUsers(fetchedUsers);
      },
      (err) => {
        console.error('Error fetching users:', err);
      }
    );

    // Fetch conversations where current user is a participant
    const unsubscribeConversations = onSnapshot(
      query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('updatedAt', 'desc')
      ),
      (snapshot) => {
        const fetchedConversations: Conversation[] = [];
        snapshot.forEach((doc) => {
          fetchedConversations.push({
            id: doc.id,
            ...doc.data(),
          } as Conversation);
        });
        setConversations(fetchedConversations);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching conversations:', err);
        setError('대화 목록을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeConversations();
    };
  }, [currentUser]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation?.id) {
      setMessages([]);
      return;
    }

    const unsubscribeMessages = onSnapshot(
      query(
        collection(db, 'conversations', selectedConversation.id, 'messages'),
        orderBy('createdAt', 'asc')
      ),
      (snapshot) => {
        const fetchedMessages: Message[] = [];
        snapshot.forEach((doc) => {
          fetchedMessages.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(fetchedMessages);

        // Mark messages as read
        markMessagesAsRead(fetchedMessages);
      },
      (err) => {
        console.error('Error fetching messages:', err);
      }
    );

    return () => unsubscribeMessages();
  }, [selectedConversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markMessagesAsRead = async (messages: Message[]) => {
    if (!currentUser || !selectedConversation?.id) return;

    const unreadMessages = messages.filter(
      (msg) =>
        msg.senderId !== currentUser.uid && !msg.readBy?.[currentUser.uid]
    );

    for (const message of unreadMessages) {
      if (message.id) {
        try {
          await updateDoc(
            doc(
              db,
              'conversations',
              selectedConversation.id,
              'messages',
              message.id
            ),
            {
              [`readBy.${currentUser.uid}`]: serverTimestamp(),
            }
          );
        } catch (err) {
          console.error('Error marking message as read:', err);
        }
      }
    }
  };

  const createNewConversation = async () => {
    if (!currentUser || selectedUsers.length === 0) return;

    try {
      const participants = [currentUser.uid, ...selectedUsers];
      const participantRoles = participants.map((userId) => {
        const user = users.find((u) => u.id === userId);
        return user?.role || 'manager';
      });

      const newConversation = {
        participants,
        participantRoles,
        lastMessage: {
          content: '',
          senderId: '',
          timestamp: serverTimestamp(),
          type: 'system' as MessageType,
        },
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, 'conversations'),
        newConversation
      );

      // Add initial system message
      await addDoc(collection(db, 'conversations', docRef.id, 'messages'), {
        senderId: 'system',
        content: '대화가 시작되었습니다.',
        type: 'system' as MessageType,
        readBy: {},
        createdAt: serverTimestamp(),
      });

      setShowNewConversation(false);
      setSelectedUsers([]);
    } catch (err) {
      console.error('Error creating conversation:', err);
      alert('대화방 생성에 실패했습니다.');
    }
  };

  const sendMessage = async () => {
    if (!currentUser || !selectedConversation?.id || !newMessage.trim()) return;

    try {
      const messageData = {
        senderId: currentUser.uid,
        content: newMessage.trim(),
        type: 'text' as MessageType,
        readBy: {
          [currentUser.uid]: serverTimestamp(),
        },
        createdAt: serverTimestamp(),
      };

      // Add message to conversation
      await addDoc(
        collection(db, 'conversations', selectedConversation.id, 'messages'),
        messageData
      );

      // Update conversation's last message
      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: {
          content: newMessage.trim(),
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
          type: 'text',
        },
        updatedAt: serverTimestamp(),
      });

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      alert('메시지 전송에 실패했습니다.');
    }
  };

  const sendImageMessage = async (file: File) => {
    if (!currentUser || !selectedConversation?.id) return;

    setUploading(true);
    try {
      // Upload image to Firebase Storage
      const storageRef = ref(storage, `chat-images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const messageData = {
        senderId: currentUser.uid,
        content: '이미지를 전송했습니다.',
        type: 'image' as MessageType,
        imageUrl: downloadURL,
        readBy: {
          [currentUser.uid]: serverTimestamp(),
        },
        createdAt: serverTimestamp(),
      };

      // Add message to conversation
      await addDoc(
        collection(db, 'conversations', selectedConversation.id, 'messages'),
        messageData
      );

      // Update conversation's last message
      await updateDoc(doc(db, 'conversations', selectedConversation.id), {
        lastMessage: {
          content: '이미지를 전송했습니다.',
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
          type: 'image',
        },
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error sending image:', err);
      alert('이미지 전송에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      sendImageMessage(file);
    } else {
      alert('이미지 파일만 업로드 가능합니다.');
    }
    event.target.value = '';
  };

  const getParticipantName = (conversation: Conversation) => {
    const otherParticipants = conversation.participants.filter(
      (id) => id !== currentUser?.uid
    );

    if (otherParticipants.length === 0) return '나';
    if (otherParticipants.length === 1) {
      const user = users.find((u) => u.id === otherParticipants[0]);
      return user?.email || 'Unknown User';
    }

    return `그룹 채팅 (${otherParticipants.length + 1}명)`;
  };

  const getUnreadCount = (conversation: Conversation) => {
    // This would need to be calculated based on actual message read status
    // For now, return 0 as placeholder
    return 0;
  };

  const filteredConversations = conversations.filter((conv) => {
    const participantName = getParticipantName(conv);
    return (
      participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
        {error}
      </div>
    );
  }

  return (
    <>
      <BackToDashboard />
      <div
        style={{
          display: 'flex',
          height: '100vh',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f5f5',
        }}
      >
        {/* Sidebar - Conversation List */}
        <div
          style={{
            width: '300px',
            backgroundColor: 'white',
            borderRight: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px',
              borderBottom: '1px solid #ddd',
              backgroundColor: '#f8f9fa',
            }}
          >
            <h2 style={{ margin: '0 0 15px 0', color: '#333' }}>💬 메시지</h2>
            <button
              onClick={() => setShowNewConversation(true)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#0056b3')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = '#007bff')
              }
            >
              ➕ 새 대화
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '15px' }}>
            <input
              type="text"
              placeholder="대화 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '20px',
                outline: 'none',
              }}
            />
          </div>

          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div
                style={{ padding: '20px', textAlign: 'center', color: '#666' }}
              >
                대화가 없습니다.
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const unreadCount = getUnreadCount(conversation);
                const isSelected = selectedConversation?.id === conversation.id;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    style={{
                      padding: '15px',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 'bold',
                            marginBottom: '5px',
                            color: '#333',
                          }}
                        >
                          {getParticipantName(conversation)}
                        </div>
                        <div
                          style={{
                            fontSize: '14px',
                            color: '#666',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {conversation.lastMessage.type === 'image'
                            ? '📷 이미지'
                            : conversation.lastMessage.content}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#999',
                            marginTop: '5px',
                          }}
                        >
                          {conversation.lastMessage.timestamp &&
                            conversation.lastMessage.timestamp
                              .toDate()
                              .toLocaleString('ko-KR')}
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <div
                          style={{
                            backgroundColor: '#dc3545',
                            color: 'white',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  borderBottom: '1px solid #ddd',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, color: '#333' }}>
                    {getParticipantName(selectedConversation)}
                  </h3>
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#666',
                      marginTop: '5px',
                    }}
                  >
                    참여자 {selectedConversation.participants.length}명
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      opacity: uploading ? 0.6 : 1,
                    }}
                  >
                    📷 이미지
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {/* Messages Area */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                }}
              >
                {messages.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      color: '#666',
                      marginTop: '50px',
                    }}
                  >
                    메시지가 없습니다. 대화를 시작해보세요!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.senderId === currentUser?.uid;
                    const isSystemMessage = message.type === 'system';
                    const sender = users.find((u) => u.id === message.senderId);

                    if (isSystemMessage) {
                      return (
                        <div
                          key={message.id}
                          style={{
                            textAlign: 'center',
                            margin: '20px 0',
                            color: '#666',
                            fontSize: '14px',
                          }}
                        >
                          {message.content}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={message.id}
                        style={{
                          display: 'flex',
                          justifyContent: isOwnMessage
                            ? 'flex-end'
                            : 'flex-start',
                          marginBottom: '15px',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '70%',
                            display: 'flex',
                            flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                            alignItems: 'flex-start',
                            gap: '10px',
                          }}
                        >
                          {!isOwnMessage && (
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#007bff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                flexShrink: 0,
                              }}
                            >
                              {sender?.email?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}

                          <div
                            style={{
                              backgroundColor: isOwnMessage
                                ? '#007bff'
                                : 'white',
                              color: isOwnMessage ? 'white' : '#333',
                              padding: '12px 16px',
                              borderRadius: '18px',
                              border: isOwnMessage ? 'none' : '1px solid #ddd',
                              position: 'relative',
                            }}
                          >
                            {!isOwnMessage && (
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: isOwnMessage ? '#ccc' : '#666',
                                  marginBottom: '4px',
                                  fontWeight: 'bold',
                                }}
                              >
                                {sender?.email || 'Unknown User'}
                              </div>
                            )}

                            {message.type === 'image' && message.imageUrl ? (
                              <div>
                                <img
                                  src={message.imageUrl}
                                  alt="첨부 이미지"
                                  style={{
                                    maxWidth: '200px',
                                    maxHeight: '200px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() =>
                                    window.open(message.imageUrl, '_blank')
                                  }
                                />
                                {message.content !==
                                  '이미지를 전송했습니다.' && (
                                  <div style={{ marginTop: '8px' }}>
                                    {message.content}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>{message.content}</div>
                            )}

                            <div
                              style={{
                                fontSize: '11px',
                                color: isOwnMessage ? '#ccc' : '#999',
                                marginTop: '4px',
                                textAlign: isOwnMessage ? 'right' : 'left',
                              }}
                            >
                              {message.createdAt
                                ?.toDate()
                                .toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  borderTop: '1px solid #ddd',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-end',
                  }}
                >
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '20px',
                      resize: 'none',
                      minHeight: '40px',
                      maxHeight: '120px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || uploading}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: newMessage.trim() ? '#007bff' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor:
                        newMessage.trim() && !uploading
                          ? 'pointer'
                          : 'not-allowed',
                      fontWeight: 'bold',
                    }}
                  >
                    전송
                  </button>
                </div>
                {uploading && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      backgroundColor: '#fff3cd',
                      color: '#856404',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  >
                    이미지 업로드 중...
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'white',
                color: '#666',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>💬</div>
                <h3>대화를 선택하세요</h3>
                <p>왼쪽에서 대화를 선택하거나 새 대화를 시작하세요.</p>
              </div>
            </div>
          )}
        </div>

        {/* New Conversation Modal */}
        {showNewConversation && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '30px',
                width: '90%',
                maxWidth: '500px',
                maxHeight: '70vh',
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <h3 style={{ margin: 0 }}>새 대화 시작</h3>
                <button
                  onClick={() => {
                    setShowNewConversation(false);
                    setSelectedUsers([]);
                    setSearchTerm('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666',
                  }}
                >
                  ×
                </button>
              </div>

              <input
                type="text"
                placeholder="사용자 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  outline: 'none',
                }}
              />

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                  사용자 선택:
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        const isSelected = selectedUsers.includes(user.id!);
                        if (isSelected) {
                          setSelectedUsers((prev) =>
                            prev.filter((id) => id !== user.id)
                          );
                        } else {
                          setSelectedUsers((prev) => [...prev, user.id!]);
                        }
                      }}
                      style={{
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedUsers.includes(user.id!)
                          ? '#e3f2fd'
                          : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{user.email}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          {user.role === 'client'
                            ? '고객'
                            : user.role === 'worker'
                              ? '청소원'
                              : '관리자'}
                        </div>
                      </div>
                      {selectedUsers.includes(user.id!) && (
                        <div style={{ color: '#007bff', fontWeight: 'bold' }}>
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedUsers.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                    선택된 사용자 ({selectedUsers.length}명):
                  </div>
                  <div
                    style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
                  >
                    {selectedUsers.map((userId) => {
                      const user = users.find((u) => u.id === userId);
                      return (
                        <span
                          key={userId}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          {user?.email}
                          <button
                            onClick={() =>
                              setSelectedUsers((prev) =>
                                prev.filter((id) => id !== userId)
                              )
                            }
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => {
                    setShowNewConversation(false);
                    setSelectedUsers([]);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={createNewConversation}
                  disabled={selectedUsers.length === 0}
                  style={{
                    padding: '10px 20px',
                    backgroundColor:
                      selectedUsers.length > 0 ? '#007bff' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor:
                      selectedUsers.length > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  대화 시작
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MessagingScreen;
