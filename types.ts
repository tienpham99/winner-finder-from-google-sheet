
export interface Submission {
  id: number;
  timestamp: string;
  phone: string;
  choice: string;
  prediction: number;
  isValid: boolean;
}

export interface SubmissionWithDiff extends Submission {
    diff: number;
}
