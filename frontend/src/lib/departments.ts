export type DepartmentSection = {
  name: string;
  departments: readonly string[];
};

export type FacultyDepartmentGroup = {
  faculty: string;
  sections: readonly DepartmentSection[];
};

export const DEPARTMENT_GROUPS: readonly FacultyDepartmentGroup[] = [
  {
    faculty: "Faculty of Applied Sciences (B.Sc)",
    sections: [
      {
        name: "Departments",
        departments: [
          "Chemistry",
          "Physics",
          "Physics with Electronics",
          "Biology",
          "Microbiology",
          "Science Laboratory Technology",
          "Environmental Management & Toxicology",
          "Computer Science with Economics",
          "Computer Science with Electronics",
          "Computer & Information Science",
          "Information Technology",
          "Information Systems",
          "Forensic Science",
          "Cyber Security",
          "Software Engineering"
        ]
      }
    ]
  },
  {
    faculty: "Faculty of Arts and Education",
    sections: [
      {
        name: "B.A",
        departments: [
          "English & Literary Studies",
          "Performing Arts & Film Studies",
          "Religious Studies"
        ]
      },
      {
        name: "B.Sc (Ed)",
        departments: [
          "Biology; Chemistry; Physics",
          "Computer Science",
          "Mathematics",
          "Physical and Health Education"
        ]
      },
      {
        name: "B.A. (Ed)",
        departments: ["English Language"]
      },
      {
        name: "B.Ed",
        departments: ["Educational Mgt.", "Social Studies", "Business Studies"]
      }
    ]
  },
  {
    faculty: "Faculty of Engineering (B.Eng)",
    sections: [
      {
        name: "Departments",
        departments: [
          "Wood Products Engineering",
          "Electrical & Electronics Engineering",
          "Telecommunications Engineering",
          "Computer Engineering",
          "Civil Engineering",
          "Mechanical Engineering"
        ]
      }
    ]
  },
  {
    faculty: "Faculty of Law",
    sections: [
      {
        name: "Programs",
        departments: ["Bachelor of Laws (LLB)", "Law & Diplomacy (BLD)"]
      }
    ]
  },
  {
    faculty: "Faculty of Social & Management Sciences (B.Sc)",
    sections: [
      {
        name: "Departments",
        departments: [
          "Accounting",
          "Business Administration",
          "Economics & Development Studies",
          "Criminology & Security Studies",
          "Politics & International Relations",
          "Banking & Finance",
          "Entrepreneurship",
          "Industrial Relations & Human Resources",
          "Marketing",
          "Psychology",
          "Sociology",
          "Public Administration",
          "Information Science & Media Studies",
          "Social Work",
          "Tourism and Hospitality Management",
          "Library and Information Science (B.LS)"
        ]
      }
    ]
  },
  {
    faculty: "Faculty of Communication & Information Science",
    sections: [
      {
        name: "Mass Communication & Media Tech.",
        departments: [
          "Public Relations",
          "Journalism",
          "Advertising",
          "Media Studies",
          "Printing and Publishing"
        ]
      },
      {
        name: "Library, Archival & Information Studies",
        departments: ["Library, Archival & Information Studies"]
      },
      {
        name: "Office and Information Management",
        departments: ["Office and Information Management"]
      },
      {
        name: "Health Information Management",
        departments: ["Health Information Management"]
      }
    ]
  },
  {
    faculty: "Faculty of Environmental Design & Mgt (Built Environment)",
    sections: [
      {
        name: "Departments",
        departments: [
          "Architecture",
          "Urban and Regional Planning",
          "Building",
          "Estate Management",
          "Quantity Surveying",
          "Surveying and Geoinformatics"
        ]
      }
    ]
  },
  {
    faculty: "Faculty of Basic Medical Sciences",
    sections: [
      {
        name: "Departments",
        departments: [
          "Human Anatomy",
          "Physiology",
          "Biochemistry",
          "Medical Laboratory Science",
          "Medical Microbiology and Parasitology",
          "Psychology (Sport, Health & Exercise)",
          "Physiotherapy",
          "Pharmacology"
        ]
      }
    ]
  },
  {
    faculty: "Faculty of Clinical Sciences",
    sections: [
      {
        name: "Departments",
        departments: [
          "Nursing",
          "Medical Radiography (Medical Imaging) & Radiation Science",
          "Dentistry",
          "Medicine",
          "Pharmacy"
        ]
      }
    ]
  },
  {
    faculty: "Faculty of Public Health",
    sections: [
      {
        name: "Departments",
        departments: [
          "Human Nutrition & Dietetics",
          "Community Health",
          "Health Promotion & Education",
          "Health Information Management",
          "Preventive Medicine and Primary Care",
          "Health Policy and Management",
          "Environmental Health Sciences"
        ]
      }
    ]
  }
] as const;

export const DEPARTMENTS: readonly string[] = Array.from(
  new Set(
    DEPARTMENT_GROUPS.flatMap((group) =>
      group.sections.flatMap((section) => section.departments)
    )
  )
).sort((a, b) => a.localeCompare(b));
