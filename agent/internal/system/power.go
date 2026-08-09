package system

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// runPower initiates a reboot or shutdown of the host. It tries passwordless
// sudo first (see install.sh's optional sudoers rule), then systemd-logind's
// loginctl, which works for users with a local console session. The call
// blocks until the command finishes or times out; a successful reboot/poweroff
// typically returns within a second while the actual shutdown happens shortly
// after, so the HTTP response still gets out.
func runPower(action string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var candidates [][]string
	switch action {
	case "reboot":
		candidates = [][]string{
			{"sudo", "-n", "systemctl", "reboot"},
			{"loginctl", "reboot"},
		}
	case "shutdown":
		candidates = [][]string{
			{"sudo", "-n", "systemctl", "poweroff"},
			{"loginctl", "poweroff"},
		}
	default:
		return fmt.Errorf("unknown power action %q", action)
	}

	var errs []string
	for _, cmd := range candidates {
		err := exec.CommandContext(ctx, cmd[0], cmd[1:]...).Run()
		if err == nil {
			return nil
		}
		errs = append(errs, fmt.Sprintf("%s: %v", strings.Join(cmd, " "), err))
	}

	return errors.New(strings.Join(errs, "; "))
}
