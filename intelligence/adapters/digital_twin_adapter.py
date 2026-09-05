"""
DealFlow360 - Digital Twin Adapter
Provides in-memory deal simulation branch creation and state evaluation
using the Deal Digital Twin pattern without modifying any production data.
"""

import copy
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class DigitalTwinAdapter:
    """Creates isolated digital twin simulation branches for what-if exploration."""

    @classmethod
    def create_simulation_branch(cls, deal_data: Dict[str, Any], changes: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a deep copy of the deal state and applies proposed changes
        to produce an isolated simulation snapshot.
        """
        # Deep copy ensures real deal is 100% untouched
        simulated_state = copy.deepcopy(deal_data)

        # Apply proposed changes
        for key, value in changes.items():
            if key == "discount_percent":
                simulated_state["discount_percent"] = float(value)
                simulated_state["current_discount_percent"] = float(value)
            elif key == "quantity":
                simulated_state["quantity"] = int(value)
            elif key == "base_price" or key == "price":
                simulated_state["base_price"] = float(value)
                simulated_state["price"] = float(value)
            elif key == "product_cost":
                simulated_state["product_cost"] = float(value)
            elif key == "required_delivery_days":
                simulated_state["required_delivery_days"] = int(value)
            elif key == "customer_tier":
                simulated_state["customer_tier"] = str(value).upper()
            elif key == "warehouses":
                simulated_state["warehouses"] = copy.deepcopy(value)
            else:
                simulated_state[key] = copy.deepcopy(value)

        # Mark as simulation
        simulated_state["is_simulation"] = True
        return simulated_state
