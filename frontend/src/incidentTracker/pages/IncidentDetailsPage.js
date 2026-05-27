import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Grid from '@mui/material/Grid2';
import { Alert, Button, Card, CardContent, Divider, List, ListItem, ListItemText, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../components/PageHeader';
import { addComment, fetchIncident, uploadAttachment } from '../services/incidentService';
import { formatDate } from '../utils/date';
import authService from '../../services/authService';

const toDisplay = (value) => value || '-';

const detailsFields = [
  ['Change Request', 'changeRequestId'],
  ['Incident Date', 'incidentDate'],
  ['Incident Month', 'incidentMonth'],
  ['Program Manager', 'programManager'],
  ['Application Name', 'applicationName'],
  ['Agile Team', 'agileTeam'],
  ['Issue Stage', 'issueStage'],
  ['Severity', 'severity'],
  ['Developer', 'developer'],
  ['Tech Lead', 'techLead'],
  ['Tester', 'tester'],
  ['Test Lead', 'testLead'],
  ['RCA Category', 'rcaCategory'],
  ['Status', 'status'],
  ['Created By', 'createdBy'],
  ['Created Date', 'createdDate'],
  ['Updated Date', 'updatedDate']
];

const yesNoFields = [
  ['Requirement Gathering', 'requirementGathering'],
  ['Impact Analysis', 'impactAnalysis'],
  ['Design Review', 'designReview'],
  ['Development Completed', 'developmentCompleted'],
  ['Unit Testing Completed', 'unitTestingCompleted'],
  ['Code Review Completed', 'codeReviewCompleted'],
  ['Test Case Preparation', 'testCasePreparation'],
  ['Test Case Review', 'testCaseReview'],
  ['Testing Completed', 'testingCompleted'],
  ['Pre-Deployment Verification', 'preDeploymentVerification'],
  ['Post-Deployment Verification', 'postDeploymentVerification']
];

export default function IncidentDetailsPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const canUpdateIncident = authService.hasPermission('incident_tracker.update');

  const load = useCallback(async () => {
    const data = await fetchIncident(id);
    setIncident(data);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const subtitle = useMemo(() => {
    if (!incident) {
      return '';
    }
    return `${incident.agileTeam || incident.applicationName || '-'} • ${incident.status || '-'}`;
  }, [incident]);

  if (!incident) {
    return null;
  }

  return (
    <>
      <PageHeader title={incident.incidentId} subtitle={subtitle} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card elevation={0} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Incident Overview</Typography>
              <Grid container spacing={2}>
                {detailsFields.map(([label, key]) => (
                  <Grid size={{ xs: 12, md: 4 }} key={key}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {key === 'incidentDate' || key === 'createdDate' || key === 'updatedDate'
                        ? formatDate(incident[key])
                        : toDisplay(incident[key])}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Incident Description</Typography>
              <Typography variant="body1">{incident.incidentDescription || '-'}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Explanation</Typography>
              <Typography variant="body2" color="text.secondary">{incident.explanation || '-'}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>RCA Details</Typography>
              <Typography variant="body2" color="text.secondary">{incident.rcaDetails || '-'}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Corrective Action</Typography>
              <Typography variant="body2" color="text.secondary">{incident.correctiveAction || '-'}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Preventive Action</Typography>
              <Typography variant="body2" color="text.secondary">{incident.preventiveAction || '-'}</Typography>
            </CardContent>
          </Card>
          <Card elevation={0} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Validation Steps</Typography>
              <Grid container spacing={2}>
                {yesNoFields.map(([label, key]) => (
                  <Grid size={{ xs: 12, md: 4 }} key={key}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body1" fontWeight={600}>{incident[key] || 'No'}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
          <Card elevation={0} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Comments</Typography>
              <Stack spacing={2}>
                {commentError ? <Alert severity="error">{commentError}</Alert> : null}
                {canUpdateIncident ? (
                  <>
                    <TextField
                      multiline
                      minRows={3}
                      label="Add Comment"
                      value={comment}
                      onChange={(e) => {
                        setComment(e.target.value);
                        setCommentError('');
                      }}
                    />
                    <Button
                      variant="contained"
                      disabled={isPostingComment || comment.trim().length === 0}
                      onClick={async () => {
                        const body = comment.trim();
                        if (!body) {
                          setCommentError('Comment body is required.');
                          return;
                        }

                        try {
                          setIsPostingComment(true);
                          await addComment(id, { body });
                          setComment('');
                          await load();
                        } catch (error) {
                          setCommentError(error.response?.data?.message || 'Unable to post comment.');
                        } finally {
                          setIsPostingComment(false);
                        }
                      }}
                    >
                      {isPostingComment ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </>
                ) : null}
                <List>
                  {(incident.comments || []).map((item) => (
                    <ListItem key={item.id} divider>
                      <ListItemText primary={item.body} secondary={`${item.user?.name || 'User'} • ${formatDate(item.createdAt)}`} />
                    </ListItem>
                  ))}
                </List>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card elevation={0} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Attachments</Typography>
              {attachmentError ? <Alert severity="error" sx={{ mb: 2 }}>{attachmentError}</Alert> : null}
              {canUpdateIncident ? (
                <Button variant="outlined" component="label" disabled={isUploadingAttachment}>
                  {isUploadingAttachment ? 'Uploading...' : 'Upload File'}
                  <input
                    hidden
                    type="file"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        setAttachmentError('');
                        setIsUploadingAttachment(true);
                        await uploadAttachment(id, formData);
                        await load();
                      } catch (error) {
                        setAttachmentError(error.response?.data?.message || 'Unable to upload attachment.');
                      } finally {
                        setIsUploadingAttachment(false);
                        event.target.value = '';
                      }
                    }}
                  />
                </Button>
              ) : null}
              <List>
                {(incident.attachments || []).map((item) => (
                  <ListItem key={item.id}>
                    <ListItemText primary={item.originalName} secondary={`${Math.round(item.size / 1024)} KB`} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
          <Card elevation={0} variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Activity History</Typography>
              <List>
                {(incident.activityLogs || []).map((item) => (
                  <ListItem key={item.id} divider>
                    <ListItemText primary={item.actionType} secondary={`${item.actionDetails} • ${formatDate(item.createdAt)}`} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
