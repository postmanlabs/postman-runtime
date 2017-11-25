#!/usr/bin/env bash

set -e;

_TRUE_="true";
_FALSE_="false";

# Outputs usage instructions
function usage {
	echo "Usage:"
	echo "    ${0}" "<control-version> <test-version>"
}

# A function to aid debugging of this script.
function __debug {
	if [[ ${RUNTIME_DEBUG} == "true" ]]; then
		echo $@;
	fi
}

# if the user does not have gnuplot installed, outputs instructions to install it.
function gnuplot_instructions {
    local TEST_DIR=$1;
    local TEST_RES_CSV=$2;
    local CONTROL_RES_CSV=$3;

    echo "gnuplot is not installed. no graphs can be plotted :(";
    if [ "$(uname)" == "Darwin" ]; then
        echo "Install gnuplot using Homebrew:";
        echo "    brew install gnuplot";
    elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
        echo "Install gnuplot using your package manager. On Ubuntu:";
        echo "    sudo apt-get install gnuplot";
    else
        echo "You are not on an Operating System we know of, install gnuplot yourself.";
    fi

    echo "After installing, run:";
    echo "";
    echo "    gnuplot ${TEST_DIR}/plot.gplot;";
    echo "";
    echo "The output will be available at ${TEST_DIR}/output.png";
    echo "";
    echo "You can also choose to skip gnuplot completely, and plot the results";
    echo "in your favorite spreadsheet editor.";
    echo "The results are available in ${TEST_RES_CSV} & ${CONTROL_RES_CSV}";
}

# Checks out the appropriate tag, creates a test script to periodically output memory usage.
function setup_version {
	local VERSION=$1;
	local VERSION_DIR=$2/${VERSION};
	local ORIG_DIR=$3;
	local NUM_ITERATIONS=$4;
	local TEST_SCRIPT="memtest.js";

	# Enter the version directory
	cd ${VERSION_DIR};

	git checkout ${VERSION} &> /dev/null;

	# Create the test script
	cat > ${VERSION_DIR}/${TEST_SCRIPT} <<-EOF
	var sdk = require('postman-collection'),
		runtime = require('./index.js'),
		runner;

	runner = new runtime.Runner();

	runner.run(new sdk.Collection({
		item: [{
			request: 'https://postman-echo.com/get'
		}, {
			request: {
				method: 'POST',
				url: 'https://postman-echo.com/post',
				body: {
					mode: 'formdata',
					formdata: [{a: '1', b: '2'}]
				}
			}
		}]
	}), { timeout: { global: Infinity }, iterationCount: ${NUM_ITERATIONS} }, function(err, run) {
		if (err) { console.error('Error creating run', err.stack); process.exit(1); }

		run.start({
			item: function (err, cursor) {
				console.log((cursor.iteration * cursor.length + cursor.position) + ',' + process.memoryUsage().heapUsed / 1048576); // mb
			},
			iteration: function (err, cursor) {
				process.stderr.clearLine();
				process.stderr.write('[${VERSION}] - completed iteration ' + cursor.iteration + ' of ' + cursor.cycles + '\r');
			},
			done: function (err) {
				if (err) { console.error(err.stack || err); process.exit(1); }
				console.error('\ndone.');
			}
		});
	});
	EOF

	# Do an npm install. Suppress all output, especially those huge trees. There is no CLI flag to turn that off :/
	npm install --only=production --silent &> /dev/null;

	# Setup is complete, go back to the original directory.
	cd ${ORIG_DIR};
}

# Runs the test script, and stores the results in a CSV file.
function record_results {
	local VERSION=$1;
	local TEST_DIR=$2;
	local TEST_SCRIPT="memtest.js";

	# errors are printed on stderr, so this is okay, and will always create a csv file.
	node ${TEST_DIR}/${VERSION}/${TEST_SCRIPT} > ${TEST_DIR}/${VERSION}.csv;
}

# uses gnuplot to plot the results from the CSV file to a PNG.
function plot_results {
	local TEST_DIR=$1;
	local CONTROL_VERSION=$2;
	local TEST_VERSION=$3;
	local CONTROL_RES_CSV=${TEST_DIR}/${CONTROL_VERSION}.csv;
	local TEST_RES_CSV=${TEST_DIR}/${TEST_VERSION}.csv;

	# Create the plot script
	cat > ${TEST_DIR}/plot.gplot <<-EOF
	set fit logfile '/dev/null'
	set datafile separator ","
	set terminal png size 1366,768 enhanced font "Helvetica,20"
	set output '${TEST_DIR}/output.png'
	set ylabel "Memory Usage (MB)"
    set xlabel "# of Requests sent"
	set key outside

	f(x) = p*x + q
	fit f(x) '${CONTROL_RES_CSV}' via p,q

	h(x) = t*x + u
	fit h(x) '${TEST_RES_CSV}' via t,u


	plot '${CONTROL_RES_CSV}' with lines title "${CONTROL_VERSION}" lw 2, f(x) title "Avg - ${CONTROL_VERSION}" lw 4, \
		 '${TEST_RES_CSV}' with lines title "${TEST_VERSION}" lw 2, h(x) title "Avg - ${TEST_VERSION}" lw 4
	EOF

	if [ $(which gnuplot) ]; then
		gnuplot ${TEST_DIR}/plot.gplot;
		echo "";
		echo "Output PNG created at: " ${TEST_DIR}/output.png;
		echo "";
		if [ $(which eog) ]; then
		    eog ${TEST_DIR}/output.png;
        elif [ "$(uname)" == "Darwin" ]; then
            open ${TEST_DIR}/output.png;
        fi
	else
	    gnuplot_instructions TEST_DIR TEST_RES_CSV CONTROL_RES_CSV;
	fi
}

function main {
	CONTROL_VERSION=$1;
	TEST_VERSION=$2;
	N_ITERATIONS=${3:-200};
	SOURCE_REPO=$(pwd);
	TEMP_DIRECTORY="/tmp/runtime-memtest-${RANDOM}";

	# Validate inputs
	if [[ -z "${CONTROL_VERSION// }" ]]; then
		echo "Control version not provided";
		exit 1;
	fi
	if [[ -z "${TEST_VERSION// }" ]]; then
		echo "Test version not provided";
		exit 1;
	fi

	rm -rf ${TEMP_DIRECTORY};
	mkdir -p ${TEMP_DIRECTORY}/${CONTROL_VERSION};
	mkdir -p ${TEMP_DIRECTORY}/${TEST_VERSION};

	git clone ${SOURCE_REPO} ${TEMP_DIRECTORY}/${CONTROL_VERSION};
	git clone ${SOURCE_REPO} ${TEMP_DIRECTORY}/${TEST_VERSION};

	# Clone, create a test file, etc in the temporary directory.
	setup_version ${CONTROL_VERSION} ${TEMP_DIRECTORY} ${SOURCE_REPO} ${N_ITERATIONS};
	setup_version ${TEST_VERSION} ${TEMP_DIRECTORY} ${SOURCE_REPO} ${N_ITERATIONS};

	record_results ${CONTROL_VERSION} ${TEMP_DIRECTORY};
	record_results ${TEST_VERSION} ${TEMP_DIRECTORY};

	plot_results ${TEMP_DIRECTORY} ${CONTROL_VERSION} ${TEST_VERSION};
}

main $@;
