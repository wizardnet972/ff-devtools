import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FeatureFlagsComponent } from './components/feature-flags/feature-flags.component';

@Component({
  imports: [RouterModule, FeatureFlagsComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'ff-example-ui';
}
