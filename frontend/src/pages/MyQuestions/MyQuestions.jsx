import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getQuestions } from '../../services/questions/question.service.js';
import QuestionCard from '../../components/QuestionCard/QuestionCard.jsx';
import styles from './MyQuestions.module.css';

export default function MyQuestions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMyQuestions = useCallback(async (isCancelledCheck = () => false) => {
    try {
      const response = await getQuestions({ mine: true });
      if (!isCancelledCheck()) {
        setQuestions(response.data || []);
        setError(null);
        setIsLoading(false);
      }
    } catch (err) {
      if (!isCancelledCheck()) {
        console.error('Error fetching my questions:', err);
        setError(
          err.response?.data?.msg ||
            err.message ||
            'Failed to load your questions. Please check your connection.',
        );
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    loadMyQuestions(() => isCancelled);

    return () => {
      isCancelled = true;
    };
  }, [loadMyQuestions]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    loadMyQuestions();
  };

  return (
    <div className={styles.myQuestionsPage}>
      {/* Top Banner Card */}
      <section className={styles.bannerCard}>
        <div className={styles.bannerCard__content}>
          <span className={styles.bannerCard__tag}>YOUR WORKSPACE</span>
          <h1 className={styles.bannerCard__title}>Your topics</h1>
          <p className={styles.bannerCard__subtitle}>
            Only questions you created. Open one to read answers or add
            follow-ups. Rows use the same left accent as your threads on Home.
          </p>
        </div>

        <button
          type='button'
          onClick={() => navigate('/questions/ask')}
          className={styles.newQuestionBtn}
        >
          <Plus size={16} />
          <span>New question</span>
        </button>
      </section>

      {/* Main Content List */}
      <section className={styles.contentSection}>
        {isLoading ? (
          <div className={styles.stateBox}>
            <div className={styles.spinner} />
            <p>Loading your topics...</p>
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <AlertCircle size={22} className={styles.errorBox__icon} />
            <div>
              <h4 className={styles.errorBox__title}>Failed to load your topics</h4>
              <p className={styles.errorBox__msg}>{error}</p>
            </div>
            <button
              type='button'
              onClick={handleRetry}
              className={styles.retryBtn}
            >
              <RotateCcw size={14} />
              Retry
            </button>
          </div>
        ) : questions.length === 0 ? (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyCard}>
              <p className={styles.emptyText}>
                You have not asked any questions yet. Use Ask a Question in the
                sidebar to start.
              </p>
              <button
                type='button'
                onClick={() => navigate('/questions/ask')}
                className={styles.emptyActionBtn}
              >
                Ask a Question
              </button>
            </div>
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
