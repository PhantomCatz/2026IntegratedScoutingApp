import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import userEvent from "@testing-library/user-event";

// 1. MOCK CONSTANTS MANUALLY (Place this BEFORE the PitScout import)
// We use // @ts-ignore or 'as any' here to satisfy the linter inside the mock
jest.mock('../src/utils/constants', () => ({
  __esModule: true,
  default: {
    TBA_AUTH_KEY: "mock_key",
    SERVER_ADDRESS: "http://localhost:25060/",
    EVENT_KEY: "2025cass", 
    NUM_ALLIANCES: 2,
    TEAMS_PER_ALLIANCE: 3,
  },
}));

// 2. Import your component AFTER the mock
import PitScout from '../src/routes/pitScout';

// 3. Setup environment globals
beforeAll(() => {
  window.alert = jest.fn();
  // Provide atob for Node environment
  global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
});

test("renders form", () => {
    render(<PitScout title="Test" />);
    expect(screen.getByText(/Pit Scout/i)).toBeInTheDocument();
});

test("allows typing in inputs", async () => {
  render(<PitScout title="Test" />);

  const input = screen.getByLabelText(/Max Fuel Capacity/i);
  await userEvent.type(input, "1");

  expect(input).toHaveValue(1);
});

test("checkbox can be changed", async () => {
  const user = userEvent.setup();
  render(<PitScout title="Test" />);
  const input = screen.getByLabelText(/Auto Aim/i);
  expect(input).not.toBeChecked();
  await user.click(input);
  expect(input).toBeChecked();
});