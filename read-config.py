import yaml
import json
import os
import sys

def main(config_path):
    try:
        with open(config_path, 'r') as file:
            config = yaml.safe_load(file)
            teams_json = json.dumps(config.get('teams', []))

            # Write to the GITHUB_ENV file to make it accessible in subsequent steps
            with open(os.getenv('GITHUB_ENV'), 'a') as env_file:
                env_file.write(f"teams={teams_json}\n")

    except Exception as e:
        print(f"Error reading config file: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python read-config.py <config-path>")
        sys.exit(1)

    main(sys.argv[1])
