import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface DeleteNodeConfirmationDialogData {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

@Component({
  selector: 'app-delete-node-confirmation-dialog',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './delete-node-confirmation-dialog.html',
  styleUrl: './delete-node-confirmation-dialog.css'
})
export class DeleteNodeConfirmationDialogComponent {
  readonly data = inject<DeleteNodeConfirmationDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject(MatDialogRef<DeleteNodeConfirmationDialogComponent, boolean>);

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
