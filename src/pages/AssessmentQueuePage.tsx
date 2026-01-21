import { useState, useEffect } from 'react';
import { Clock, Check, User, Calendar, Cpu, Briefcase } from 'lucide-react';
import { ideaService } from '../services/ideaService';
import { Idea, ScoreLevel } from '../data/ideas';
import { ScoreCard } from '../components/ScoreCard';
import { useToast } from '../components/Toast';
import './AssessmentQueuePage.css';

export function AssessmentQueuePage() {
    const { showToast } = useToast();
    const [pendingIdeas, setPendingIdeas] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Assessment state
    const [scores, setScores] = useState<Record<string, ScoreLevel>>({});
    const [rationales, setRationales] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchPendingIdeas();
    }, []);

    const fetchPendingIdeas = async () => {
        setLoading(true);
        const submitted = await ideaService.getIdeasByStatus('submitted');
        const underReview = await ideaService.getIdeasByStatus('under_review');
        setPendingIdeas([...submitted, ...underReview]);
        setLoading(false);
    };

    const handleSelectIdea = async (idea: Idea) => {
        setSelectedIdea(idea);
        setScores({});
        setRationales({});
        // Mark as under review
        if (idea.status === 'submitted') {
            await ideaService.updateIdeaStatus(idea.id, 'under_review');
            fetchPendingIdeas();
        }
    };

    const handleScoreChange = (dimension: string, score: ScoreLevel) => {
        setScores(prev => ({ ...prev, [dimension]: score }));
    };

    const handleRationaleChange = (dimension: string, rationale: string) => {
        setRationales(prev => ({ ...prev, [dimension]: rationale }));
    };

    const isComplete = () => {
        const requiredDimensions = [
            'businessGrowth', 'costEfficiency', 'businessResilience', 'businessAgility',
            'technicalFeasibility', 'internalReadiness', 'externalReadiness'
        ];
        return requiredDimensions.every(dim => scores[dim]);
    };

    const handleSubmitAssessment = async () => {
        if (!selectedIdea || !isComplete()) {
            showToast('Please score all dimensions before submitting', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            await ideaService.submitAssessment(selectedIdea.id, {
                businessGrowth: scores.businessGrowth,
                costEfficiency: scores.costEfficiency,
                businessResilience: scores.businessResilience,
                businessAgility: scores.businessAgility,
                technicalFeasibility: scores.technicalFeasibility,
                internalReadiness: scores.internalReadiness,
                externalReadiness: scores.externalReadiness,
                rationales,
                assessedBy: 'Assessment Team'
            });

            showToast(`"${selectedIdea.title}" has been assessed!`, 'success');
            setSelectedIdea(null);
            setScores({});
            setRationales({});
            fetchPendingIdeas();
        } catch {
            showToast('Failed to submit assessment', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="assessment-loading">
                <div className="loading-spinner"></div>
                <p>Loading pending ideas...</p>
            </div>
        );
    }

    return (
        <div className="assessment-page">
            <div className="container">
                <header className="assessment-header">
                    <div>
                        <h1>Assessment Queue</h1>
                        <p>Review and score AI use case ideas using the Value-Feasibility framework.</p>
                    </div>
                    <div className="pending-badge">
                        <Clock size={18} />
                        <span>{pendingIdeas.length} pending</span>
                    </div>
                </header>

                <div className="assessment-layout">
                    {/* Ideas List */}
                    <div className="ideas-list">
                        {pendingIdeas.length === 0 ? (
                            <div className="empty-queue">
                                <Check size={48} />
                                <h3>All caught up!</h3>
                                <p>No ideas pending assessment.</p>
                            </div>
                        ) : (
                            pendingIdeas.map(idea => (
                                <button
                                    key={idea.id}
                                    className={`idea-queue-card ${selectedIdea?.id === idea.id ? 'selected' : ''}`}
                                    onClick={() => handleSelectIdea(idea)}
                                >
                                    <div className="idea-queue-header">
                                        <span className={`status-badge status-${idea.status}`}>
                                            {idea.status === 'submitted' ? 'New' : 'In Review'}
                                        </span>
                                        <span className="idea-date">
                                            <Calendar size={12} />
                                            {new Date(idea.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <h3>{idea.title}</h3>
                                    <div className="idea-queue-meta">
                                        <span><Cpu size={14} /> {idea.aiCapabilityArea}</span>
                                        <span><Briefcase size={14} /> {idea.businessFunction}</span>
                                    </div>
                                    <span className="submitter"><User size={12} /> {idea.submitterName}</span>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Assessment Panel */}
                    <div className="assessment-panel">
                        {selectedIdea ? (
                            <>
                                <div className="panel-header">
                                    <h2>{selectedIdea.title}</h2>
                                </div>

                                <div className="panel-content">
                                    <div className="idea-details">
                                        <div className="detail-row">
                                            <span className="detail-label">AI Capability</span>
                                            <span className="detail-value">{selectedIdea.aiCapabilityArea}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Business Function</span>
                                            <span className="detail-value">{selectedIdea.businessFunction}</span>
                                        </div>
                                    </div>

                                    <div className="idea-description">
                                        <h4>Description</h4>
                                        <p>{selectedIdea.description}</p>
                                    </div>

                                    {selectedIdea.expectedBenefits && (
                                        <div className="idea-benefits">
                                            <h4>Expected Benefits</h4>
                                            <p>{selectedIdea.expectedBenefits}</p>
                                        </div>
                                    )}

                                    <div className="scorecard-section">
                                        <h4>Assessment Scorecard</h4>
                                        <p className="scorecard-hint">Score each dimension to calculate Value and Feasibility.</p>
                                        <ScoreCard
                                            values={scores}
                                            rationales={rationales}
                                            onScoreChange={handleScoreChange}
                                            onRationaleChange={handleRationaleChange}
                                        />
                                    </div>
                                </div>

                                <div className="panel-actions">
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => setSelectedIdea(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSubmitAssessment}
                                        disabled={!isComplete() || submitting}
                                    >
                                        <Check size={18} />
                                        {submitting ? 'Submitting...' : 'Submit Assessment'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="no-selection">
                                <Clock size={48} />
                                <h3>Select an idea to assess</h3>
                                <p>Click on an idea from the queue to begin assessment.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
