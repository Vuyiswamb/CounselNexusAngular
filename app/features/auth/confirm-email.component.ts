import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-confirm-email',
  imports: [RouterLink],
  templateUrl: './confirm-email.component.html',
  styleUrls: ['./confirm-email.component.css'],
})
export class ConfirmEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  email = '';
  confirming = false;
  confirmed = false;
  error = '';

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    const userId = this.route.snapshot.queryParamMap.get('userId');
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!userId || !token) return;

    this.confirming = true;
    this.auth.confirmEmail(userId, token).subscribe({
      next: () => { this.confirming = false; this.confirmed = true; },
      error: (err) => {
        this.confirming = false;
        this.error = err?.error?.detail ?? 'This confirmation link is invalid or has expired.';
      },
    });
  }
}
