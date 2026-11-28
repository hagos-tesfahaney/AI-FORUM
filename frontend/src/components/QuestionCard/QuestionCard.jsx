import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { timeAgo, isAuthoredByUser, getInitials } from '../../lib/utils.js';
import styles from './QuestionCard.module.css';

// Preset cheerful avatar background colors
const AVATAR_COLORS = [
  '#0d9488', // Teal
  '#16a34a', // Green
  '#ea580c', // Orange
  '#2563eb', // Blue
  '#9333ea', // Purple
  '#0284c7', // Sky
];

const getAvatarBg = name => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export default function QuestionCard({ question, currentUser }) {
  const navigate = useNavigate();

  if (!question) return null;

  const isOwner = isAuthoredByUser(question, currentUser);
  const authorName = question.author
    ? `${question.author.firstName || ''} ${question.author.lastName || ''}`.trim() || 'Anonymous'
    : 'Anonymous';
  const authorInitials = getInitials(
    question.author?.firstName,
    question.author?.lastName,
  );
  const avatarBg = getAvatarBg(authorName);

  const handleCardClick = () => {
    navigate(`/questions/${question.questionHash}`);
  };

  const answerCount = question.answerCount || 0;
  const replyText = `${answerCount} ${answerCount === 1 ? 'reply' : 'replies'}`;

  // Truncate long content for preview
  const previewText =
    question.content && question.content.length > 200
      ? `${question.content.slice(0, 200)}...`
      : question.content;

  return (
    <article
      className={`${styles.card} ${isOwner ? styles['card--owner'] : ''}`}
      onClick={handleCardClick}
      role='button'
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div className={styles.card__layout}>
        <div
          className={styles.card__avatar}
          style={{ backgroundColor: avatarBg }}
          aria-hidden='true'
        >
          {authorInitials}
        </div>

        <div className={styles.card__main}>
          <div className={styles.card__header}>
            <h3 className={styles.card__title}>{question.title}</h3>
            <div className={styles.card__badges}>
              {isOwner && <span className={styles.card__yoursBadge}>YOURS</span>}
            </div>
          </div>

          {previewText && (
            <p className={styles.card__snippet}>{previewText}</p>
          )}

          <div className={styles.card__meta}>
            <span className={styles.card__replies}>
              <MessageSquare size={14} className={styles.card__metaIcon} />
              {replyText}
            </span>
            <span className={styles.card__dot}>•</span>
            <span className={styles.card__time}>
              {timeAgo(question.createdAt)} by{' '}
              <strong className={styles.card__author}>
                {isOwner ? 'You' : authorName}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
