"""
DealFlow360 - Training Dataset Generator Entrypoint
Generates intents dataset (intents.json) for Customer Deal Assistant intent classification.
"""

import sys
import os

# Add fast-ml root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from training_data.generate_intent_dataset import save_intents_dataset, build_intents_dataset


def main():
    print("Generating comprehensive intent classification dataset...")
    output_path = save_intents_dataset()
    print(f"Dataset generated successfully at: {output_path}")


if __name__ == "__main__":
    main()
