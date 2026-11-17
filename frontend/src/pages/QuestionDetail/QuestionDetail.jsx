import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  MessageSquare,
  Share2,
  Sparkles,
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSingleQuestion,
  getSimilarQuestions,
  assessAnswerFit,
} from '../../services/questions/question.service.js';
import { postAnswer } from '../../services/answers/answer.service.js';
import { isAuthoredByUser, getInitials } from '../../lib/utils.js';
import styles from './QuestionDetail.module.css';

// Preset avatar background colors
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
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function QuestionDetail() {
  const { questionHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Answer Form state
  const [answerContent, setAnswerContent] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [postAnswerError, setPostAnswerError] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  // Answer Fit state
  const [isCheckingFit, setIsCheckingFit] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const [fitError, setFitError] = useState('');

  const answerTextareaRef = useRef(null);

  useEffect(() => {
    if (!questionHash) return;
    let isCancelled = false;

    const load = async () => {
      try {
        const response = await getSingleQuestion(questionHash);
        if (!isCancelled) {
          setQuestion(response.question);
          setAnswers(response.answers || []);
          setIsLoading(false);
        }

        try {
          const similarRes = await getSimilarQuestions(questionHash);
          if (!isCancelled) {
            setSimilarQuestions(similarRes.data || []);
          }
        } catch (similarErr) {
          console.warn('Could not load similar questions:', similarErr);
          if (!isCancelled) setSimilarQuestions([]);
        }
      } catch (err) {
        console.error('Error loading question details:', err);
        if (!isCancelled) {
          setError(
            err.response?.data?.msg ||
              err.response?.data?.message ||
              'Question not found or server error.',
          );
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [questionHash]);

  const insertAnswerFormatting = (prefix, suffix = '') => {
    const textarea = answerTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = answerContent.substring(start, end) || 'code';
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent =
      answerContent.substring(0, start) +
      replacement +
      answerContent.substring(end);

    setAnswerContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length,
      );
    }, 0);
  };

  const handleCheckFit = async () => {
    setFitError('');
    setFitResult(null);

    if (answerContent.trim().length < 20) {
      setFitError('You need at least 20 characters before checking answer fit.');
      return;
    }

    setIsCheckingFit(true);
    try {
      const res = await assessAnswerFit(questionHash, answerContent.trim());
      setFitResult(res.data);
    } catch (err) {
      console.error('Error assessing answer fit:', err);
      setFitError('Could not assess answer fit at this time.');
    } finally {
      setIsCheckingFit(false);
    }
  };

  const handlePostAnswer = async e => {
    e.preventDefault();
    setValidationError('');
    setPostAnswerError('');

    const trimmed = answerContent.trim();
    if (!trimmed) {
      setValidationError('Answer content is required.');
      return;
    }
    if (trimmed.length < 20) {
      setValidationError('Answer must be at least 20 characters long.');
      return;
    }

    setIsSubmittingAnswer(true);
    try {
      const res = await postAnswer(question.id, trimmed);
      const newAnswer = res.data;

      // Append new answer to state and update count
      setAnswers(prev => [...prev, newAnswer]);
      setQuestion(prev => ({
        ...prev,
        answerCount: (prev.answerCount || 0) + 1,
      }));

      // Reset form
      setAnswerContent('');
      setFitResult(null);
    } catch (err) {
      console.error('Failed to post answer:', err);
      setPostAnswerError(
        err.response?.data?.msg ||
          err.response?.data?.message ||
          'Failed to post answer. Please try again.',
      );
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleShareClick = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Loading discussion thread...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className={styles.errorState}>
        <AlertCircle size={32} className={styles.errorState__icon} />
        <h2 className={styles.errorState__title}>Thread Not Found</h2>
        <p className={styles.errorState__desc}>
          {error || 'This question does not exist or may have been deleted.'}
        </p>
        <button
          type='button'
          onClick={() => navigate('/dashboard')}
          className={styles.backButton}
        >
          <ArrowLeft size={16} />
          Back to Feed
        </button>
      </div>
    );
  }

  const isOwner = isAuthoredByUser(question, user);
  const authorName = question.author
    ? `${question.author.firstName || ''} ${question.author.lastName || ''}`.trim() || 'Anonymous'
    : 'Anonymous';
  const authorInitials = getInitials(
    question.author?.firstName,
    question.author?.lastName,
  );
  const avatarBg = getAvatarBg(authorName);

  const formattedDate = question.createdAt
    ? new Date(question.createdAt).toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className={styles.page}>
      {/* Back to feed link */}
      <button
        type='button'
        onClick={() => navigate('/dashboard')}
        className={styles.backLink}
      >
        <ArrowLeft size={16} />
        <span>Back to feed</span>
      </button>

      {/* Main Content Layout */}
      <div className={styles.contentLayout}>
        {/* Left Column: Question, Answers, Post Form */}
        <div className={styles.mainColumn}>
          {/* Question Card */}
          <article className={styles.questionCard}>
            <div className={styles.authorRow}>
              <div
                className={styles.authorAvatar}
                style={{ backgroundColor: avatarBg }}
              >
                {authorInitials}
              </div>
              <div className={styles.authorMeta}>
                <span className={styles.authorName}>{authorName}</span>
                <span className={styles.postDate}>Posted {formattedDate}</span>
              </div>
            </div>

            <h1 className={styles.questionTitle}>{question.title}</h1>

            <div className={styles.questionBody}>
              <ReactMarkdown>{question.content}</ReactMarkdown>
            </div>

            <div className={styles.questionFooter}>
              <button
                type='button'
                onClick={handleShareClick}
                className={styles.actionBtn}
                title='Copy link to thread'
              >
                <Share2 size={14} />
                <span>{shareCopied ? 'Link Copied!' : 'Share'}</span>
              </button>

              <span className={styles.answerCountBadge}>
                <MessageSquare size={14} />
                <span>
                  {answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}
                </span>
              </span>
            </div>
          </article>

          {/* Community Answers Section */}
          <section className={styles.answersSection}>
            <h2 className={styles.answersHeading}>
              Community Answers ({answers.length})
            </h2>

            {answers.length === 0 ? (
              <div className={styles.emptyAnswersBox}>
                <MessageSquare size={32} className={styles.emptyAnswersIcon} />
                <h3 className={styles.emptyAnswersTitle}>Be the first to help!</h3>
                <p className={styles.emptyAnswersDesc}>
                  This question is waiting for an expert like you. Share your
                  knowledge and earn reputation points.
                </p>
              </div>
            ) : (
              <div className={styles.answersList}>
                {answers.map(ans => {
                  const ansAuthorName = ans.author
                    ? `${ans.author.firstName || ''} ${ans.author.lastName || ''}`.trim() || 'Contributor'
                    : 'Contributor';
                  const ansInitials = getInitials(
                    ans.author?.firstName,
                    ans.author?.lastName,
                  );
                  const ansDate = ans.createdAt
                    ? new Date(ans.createdAt).toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '';

                  return (
                    <article key={ans.id} className={styles.answerCard}>
                      <div className={styles.authorRow}>
                        <div
                          className={styles.authorAvatar}
                          style={{ backgroundColor: getAvatarBg(ansAuthorName) }}
                        >
                          {ansInitials}
                        </div>
                        <div className={styles.authorMeta}>
                          <span className={styles.authorName}>
                            {ansAuthorName}
                          </span>
                          <span className={styles.postDate}>{ansDate}</span>
                        </div>
                      </div>

                      <div className={styles.answerBody}>
                        <ReactMarkdown>{ans.content}</ReactMarkdown>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Contribute an Answer Form */}
          {isOwner ? (
            <div className={styles.authorNoticeBox}>
              <HelpCircle size={20} className={styles.authorNoticeIcon} />
              <div>
                <h4 className={styles.authorNoticeTitle}>
                  You are the author of this topic
                </h4>
                <p className={styles.authorNoticeDesc}>
                  You cannot answer your own question. You can review suggestions
                  and reply to community answers.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePostAnswer} className={styles.answerFormCard}>
              <h3 className={styles.formTitle}>Contribute an answer</h3>

              {postAnswerError && (
                <div className={styles.errorAlert}>
                  <AlertCircle size={16} />
                  <span>{postAnswerError}</span>
                </div>
              )}

              <div className={styles.editorWrap}>
                <div className={styles.toolbar}>
                  <div className={styles.toolbar__buttons}>
                    <button
                      type='button'
                      onClick={() => insertAnswerFormatting('**', '**')}
                      className={styles.toolbar__btn}
                      title='Bold'
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type='button'
                      onClick={() => insertAnswerFormatting('*', '*')}
                      className={styles.toolbar__btn}
                      title='Italic'
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      type='button'
                      onClick={() => insertAnswerFormatting('```\n', '\n```')}
                      className={styles.toolbar__btn}
                      title='Code Block'
                    >
                      <Code size={14} />
                    </button>
                    <button
                      type='button'
                      onClick={() => insertAnswerFormatting('[', '](url)')}
                      className={styles.toolbar__btn}
                      title='Link'
                    >
                      <LinkIcon size={14} />
                    </button>
                  </div>
                  <span className={styles.charCount}>
                    {answerContent.length} characters
                  </span>
                </div>

                <textarea
                  ref={answerTextareaRef}
                  rows={8}
                  value={answerContent}
                  onChange={e => {
                    setAnswerContent(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                  placeholder='Type your answer here... You can use Markdown to format your code!'
                  className={`${styles.answerTextarea} ${
                    validationError ? styles['answerTextarea--error'] : ''
                  }`}
                  disabled={isSubmittingAnswer}
                />
              </div>

              {validationError && (
                <span className={styles.errorText}>{validationError}</span>
              )}

              {/* AI Answer Fit Row */}
              <div className={styles.aiFitRow}>
                <button
                  type='button'
                  onClick={handleCheckFit}
                  disabled={isCheckingFit || isSubmittingAnswer}
                  className={styles.checkFitBtn}
                >
                  <Sparkles size={15} />
                  <span>{isCheckingFit ? 'Evaluating...' : 'Check draft fit'}</span>
                </button>
                <span className={styles.checkFitHelp}>
                  Relevance only. Not grading correctness. You need at least 20
                  characters.
                </span>
              </div>

              {fitError && (
                <div className={styles.fitErrorBox}>
                  <AlertCircle size={14} />
                  <span>{fitError}</span>
                </div>
              )}

              {/* AI Fit Result Panel */}
              {fitResult && (
                <div
                  className={`${styles.fitResultBox} ${
                    fitResult.level === 'strong'
                      ? styles['fitResultBox--strong']
                      : fitResult.level === 'partial'
                      ? styles['fitResultBox--partial']
                      : styles['fitResultBox--weak']
                  }`}
                >
                  <div className={styles.fitResultHeader}>
                    <span
                      className={`${styles.fitLevelBadge} ${
                        styles[`fitLevelBadge--${fitResult.level}`]
                      }`}
                    >
                      {fitResult.level.toUpperCase()} FIT
                    </span>
                    <span className={styles.fitResultTitle}>
                      AI Answer Assessment
                    </span>
                  </div>
                  <p className={styles.fitResultNote}>{fitResult.note}</p>
                </div>
              )}

              {/* Submit Row */}
              <div className={styles.formFooter}>
                <button
                  type='submit'
                  disabled={isSubmittingAnswer}
                  className={styles.submitAnswerBtn}
                >
                  {isSubmittingAnswer ? 'Posting...' : 'Post Your Answer'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Sidebar: Related Questions */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Related Questions</h3>

            {similarQuestions.length === 0 ? (
              <p className={styles.noRelatedText}>
                No related topics found yet. As more questions are asked,
                AI-recommended matches will appear here.
              </p>
            ) : (
              <div className={styles.relatedList}>
                {similarQuestions.map(item => {
                  const authorStr = item.author
                    ? `${item.author.firstName || ''} ${item.author.lastName || ''}`.trim() || 'Anonymous'
                    : 'Anonymous';
                  const itemDate = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '';

                  return (
                    <div
                      key={item.id || item.questionHash}
                      className={styles.relatedItem}
                      onClick={() => navigate(`/questions/${item.questionHash}`)}
                      role='button'
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter')
                          navigate(`/questions/${item.questionHash}`);
                      }}
                    >
                      <h4 className={styles.relatedTitle}>{item.title}</h4>
                      <div className={styles.relatedMeta}>
                        <span>{authorStr}</span>
                        <span>{itemDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
