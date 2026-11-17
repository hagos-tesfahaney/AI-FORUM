import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  PenSquare,
  BarChart2,
  BookOpen,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Search,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getQuestions,
  searchQuestionsSemantic,
} from '../../services/questions/question.service.js';
import { isAuthoredByUser } from '../../lib/utils.js';
import QuestionCard from '../../components/QuestionCard/QuestionCard.jsx';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryParams = new URLSearchParams(location.search);
  const keywordQuery = queryParams.get('q') || '';
  const semanticQuery = queryParams.get('semantic') || '';

  const loadData = useCallback(async (isCancelledCheck = () => false) => {
    try {
      let response;
      if (semanticQuery.trim()) {
        response = await searchQuestionsSemantic(semanticQuery.trim());
      } else if (keywordQuery.trim()) {
        response = await getQuestions({ search: keywordQuery.trim() });
      } else {
        response = await getQuestions();
      }

      if (!isCancelledCheck()) {
        setQuestions(response.data || []);
        setError(null);
        setIsLoading(false);
      }
    } catch (err) {
      if (!isCancelledCheck()) {
        console.error('Error fetching questions:', err);
        setError(
          err.response?.data?.msg ||
            err.message ||
            'Failed to load questions. Please check your connection.',
        );
        setQuestions([]);
        setIsLoading(false);
      }
    }
  }, [keywordQuery, semanticQuery]);

  useEffect(() => {
    let isCancelled = false;
    loadData(() => isCancelled);

    return () => {
      isCancelled = true;
    };
  }, [loadData]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    loadData();
  };

  const firstName = user?.firstName?.trim() || 'there';

  // Metrics
  const totalQuestions = questions.length;
  const totalReplies = questions.reduce(
    (sum, q) => sum + (Number(q.answerCount) || 0),
    0,
  );
  const unansweredCount = questions.filter(
    q => (Number(q.answerCount) || 0) === 0,
  ).length;
  const yoursCount = questions.filter(q => isAuthoredByUser(q, user)).length;

  const isSearchActive = Boolean(keywordQuery.trim() || semanticQuery.trim());

  return (
    <div className={styles.dashboard}>
      {/* Forum Home Hero Box */}
      <section className={styles.heroBox}>
        <div className={styles.heroBox__badge}>FORUM HOME</div>
        <h1 className={styles.heroBox__title}>Good to see you, {firstName}.</h1>
        <p className={styles.heroBox__subtitle}>
          Start a topic, revisit your own threads, or skim the live feed. Search
          above works from any page once you are back on Home.
        </p>

        {/* 3 Quick Action Cards */}
        <div className={styles.actionGrid}>
          <div
            className={styles.actionCard}
            onClick={() => navigate('/questions/ask')}
            role='button'
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter') navigate('/questions/ask');
            }}
          >
            <div className={styles.actionCard__iconWrap}>
              <PenSquare size={20} className={styles.actionCard__icon} />
            </div>
            <div>
              <h4 className={styles.actionCard__heading}>New question</h4>
              <p className={styles.actionCard__desc}>
                Share context, errors, and what you already tried
              </p>
            </div>
          </div>

          <div
            className={styles.actionCard}
            onClick={() => navigate('/my-questions')}
            role='button'
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter') navigate('/my-questions');
            }}
          >
            <div className={styles.actionCard__iconWrap}>
              <BarChart2 size={20} className={styles.actionCard__icon} />
            </div>
            <div>
              <h4 className={styles.actionCard__heading}>Your topics</h4>
              <p className={styles.actionCard__desc}>
                Filtered list of threads you authored
              </p>
            </div>
          </div>

          <div
            className={styles.actionCard}
            onClick={() => navigate('/rag-documents')}
            role='button'
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter') navigate('/rag-documents');
            }}
          >
            <div className={styles.actionCard__iconWrap}>
              <BookOpen size={20} className={styles.actionCard__icon} />
            </div>
            <div>
              <h4 className={styles.actionCard__heading}>Knowledge base</h4>
              <p className={styles.actionCard__desc}>
                Course library, uploads, and retrieval-backed context for threads
              </p>
            </div>
          </div>
        </div>

        {/* Feed stats overview */}
        <div className={styles.statsOverview}>
          <p className={styles.statsOverview__note}>
            Figures below describe the newest threads in this feed (up to 100
            from the API).
          </p>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statBox__label}>Questions</span>
              <span className={styles.statBox__value}>{totalQuestions}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statBox__label}>Replies</span>
              <span className={styles.statBox__value}>{totalReplies}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statBox__label}>Unanswered</span>
              <span className={styles.statBox__value}>{unansweredCount}</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statBox__label}>Yours</span>
              <span className={styles.statBox__value}>{yoursCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Discussion Feed Section */}
      <section className={styles.feedSection}>
        <div className={styles.feedSection__header}>
          <div>
            <h2 className={styles.feedSection__title}>Discussion feed</h2>
            <p className={styles.feedSection__subtitle}>
              Your threads use a slim left accent in this list.
            </p>
          </div>

          <div className={styles.feedSection__badgeWrap}>
            {semanticQuery.trim() ? (
              <div className={styles.filterPill}>
                <Sparkles size={13} />
                <span>AI Search: &quot;{semanticQuery}&quot;</span>
                <button
                  type='button'
                  onClick={() => navigate('/dashboard')}
                  className={styles.filterPill__clear}
                  title='Clear search'
                >
                  ✕
                </button>
              </div>
            ) : keywordQuery.trim() ? (
              <div className={styles.filterPill}>
                <Search size={13} />
                <span>Search: &quot;{keywordQuery}&quot;</span>
                <button
                  type='button'
                  onClick={() => navigate('/dashboard')}
                  className={styles.filterPill__clear}
                  title='Clear search'
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className={styles.newestBadge}>NEWEST THREADS</span>
            )}
          </div>
        </div>

        {/* Feed Content */}
        {isLoading ? (
          <div className={styles.stateContainer}>
            <div className={styles.loadingSpinner} />
            <p className={styles.stateContainer__text}>Loading questions...</p>
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <AlertCircle size={24} className={styles.errorBox__icon} />
            <div>
              <h4 className={styles.errorBox__title}>Failed to load feed</h4>
              <p className={styles.errorBox__msg}>{error}</p>
            </div>
            <button
              type='button'
              onClick={handleRetry}
              className={styles.retryButton}
            >
              <RotateCcw size={14} />
              Retry
            </button>
          </div>
        ) : questions.length === 0 ? (
          <div className={styles.emptyBox}>
            <h3 className={styles.emptyBox__title}>No questions found</h3>
            <p className={styles.emptyBox__subtitle}>
              {isSearchActive
                ? 'No topics matched your search criteria. Try a broader keyword or switch to AI search.'
                : 'There are no active discussions yet. Be the first to start a discussion!'}
            </p>
            {isSearchActive ? (
              <button
                type='button'
                onClick={() => navigate('/dashboard')}
                className={styles.emptyBox__buttonSecondary}
              >
                Clear Search
              </button>
            ) : (
              <button
                type='button'
                onClick={() => navigate('/questions/ask')}
                className={styles.emptyBox__buttonPrimary}
              >
                Ask a Question
              </button>
            )}
          </div>
        ) : (
          <div className={styles.questionsList}>
            {questions.map(q => (
              <QuestionCard
                key={q.id || q.questionHash}
                question={q}
                currentUser={user}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
