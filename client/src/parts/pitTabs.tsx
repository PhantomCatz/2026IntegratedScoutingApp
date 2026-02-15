import { Input, TextArea, Checkbox } from './formItems';
import '../public/stylesheets/pitLookup.css';

import type { TabItems } from './tabs';
import type * as Database from '../types/database';

const IMAGE_DELIMITER = "$";

type Props = {
	teamNumber: number
	data: Database.PitDataFullEntry[] | null;
};

function PitTabs(props: Props): TabItems {
	const teamNumber = props.teamNumber;
	const data = props.data;

	const pitEntries: TabItems = [];

	if (!teamNumber || !data) {
		return pitEntries;
	}

	const matches: TabItems = [];

	for (const pitInfo of data) {
		pitInfo.comments = pitInfo.comments.replaceAll("\\n", "\n");

		const images = pitInfo.robot_image_uri.split(IMAGE_DELIMITER).filter((x: string) => x !== "");

		const pictures = [];

		if(images.length > 0) {
			for(let i = 0; i < images.length; i++) {
				pictures.push(
					<div key={`pitImage${i}`}>
						<h3>Picture {i + 1}</h3>
						<img className={"pitImage"} src={images[i]}></img>
					</div>
				);
			}
		} else {
			pictures.push(
				<p key={"pitImage__no-pictures"}>
					No Pit Pictures D:
				</p>
			);
		}

		matches.push({
			key: `pitData${pitInfo.id}`,
			label: `${pitInfo.scouter_initials.toUpperCase()}:${pitInfo.team_number}`,
			children: (
				<div className="pitTabs">
					<h2>Event Key</h2>
					<Input disabled defaultValue={pitInfo.event_key} />
					<h2>Scouter Initials</h2>
					<Input disabled defaultValue={pitInfo.scouter_initials} />
					<h2>Robot Weight</h2>
					<Input disabled defaultValue={pitInfo.robot_weight.toString()} />
					<h2>Drive Train Type</h2>
					<Input disabled defaultValue={pitInfo.drive_train_type} />
					<h2>Propulsion Motor Type</h2>
					<Input disabled defaultValue={pitInfo.propulsion_motor_type} />
					<h2># of Propulsion Motors</h2>
					<Input disabled defaultValue={pitInfo.number_of_propulsion_motors.toString()} />
					<h2>Wheel Type</h2>
					<Input disabled defaultValue={pitInfo.wheel_type} />
					<h2>Fuel Intake Location</h2>
					<Input disabled defaultValue={pitInfo.fuel_intake_location} />
					<h2>Intake Type</h2>
					<Input disabled defaultValue={pitInfo.intake_type} />
					<h2>Intake Width</h2>
					<Input disabled defaultValue={pitInfo.intake_width} />
					<h2>Max Fuel Capacity</h2>
					<Input disabled defaultValue={pitInfo.max_fuel_capacity.toString()} />
					<h2>Max Shot Range</h2>
					<Input disabled defaultValue={pitInfo.max_shot_range} />
					<h2>Trench Capability</h2>
					<Checkbox disabled defaultValue={Boolean(pitInfo.trench_capability)}/>
					<h2>Climb During Auto</h2>
					<Checkbox disabled defaultValue={Boolean(pitInfo.climb_during_auto)} />
					<h2>Can Climb L1</h2>
					<Checkbox disabled defaultValue={Boolean(pitInfo.can_climb_l1)} />
					<h2>Can Climb L2</h2>
					<Checkbox disabled defaultValue={Boolean(pitInfo.can_climb_l2)} />
					<h2>Can Climb L3</h2>
					<Checkbox disabled defaultValue={Boolean(pitInfo.can_climb_l3)} />
					<h2>Pit Organization</h2>
					<Input disabled defaultValue={pitInfo.pit_organization.toString()} />
					<h2>Team Safety</h2>
					<Input disabled defaultValue={pitInfo.team_safety.toString()} />
					<h2>Team Workmanship</h2>
					<Input disabled defaultValue={pitInfo.team_workmanship.toString()} />
					<h2>Gracious Professionalism</h2>
					<Input disabled defaultValue={pitInfo.gracious_professionalism.toString()} />
					<h2>Any Electrical Issues</h2>
					<TextArea disabled defaultValue={pitInfo.any_electrical_issues} />
					<h2>Comments</h2>
					<TextArea disabled defaultValue={pitInfo.comments} />

					<h2>Pit Pictures</h2>
					{pictures}
				</div>
			)
		});
	}
	matches.sort((a, b) => parseInt(a.key) - parseInt(b.key));

	return matches;
}

export default PitTabs;
